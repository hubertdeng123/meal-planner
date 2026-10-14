"""Unit tests for recipe generation context, prompt building and persistence."""

import random

import pytest

from app.models.pantry import PantryItem
from app.models.recipe import Recipe, RecipeFeedback
from app.schemas.llm_response import RecipeLLM
from app.schemas.recipe import RecipeGenerationRequest
from app.services import recipe_generation as rg


def _recipe(db, user, name, ingredients, cuisine=None):
    recipe = Recipe(
        user_id=user.id,
        name=name,
        cuisine=cuisine,
        instructions=["Cook"],
        ingredients=[{"name": n, "quantity": 1, "unit": "cup"} for n in ingredients],
        servings=2,
        tags=[],
        source="test",
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


def _rate(db, user, recipe, rating):
    db.add(
        RecipeFeedback(
            user_id=user.id, recipe_id=recipe.id, rating=rating, liked=rating >= 4
        )
    )
    db.commit()


def test_prefetch_user_context_splits_feedback(db, test_user):
    test_user.dietary_restrictions = ["vegetarian"]
    test_user.food_preferences = {"cuisines": ["Thai", "Italian"]}
    db.commit()

    loved = _recipe(db, test_user, "Green Curry", ["coconut milk", "garlic"], "Thai")
    _rate(db, test_user, loved, 5)
    hated = _recipe(db, test_user, "Liver Pate", ["liver", "garlic"])
    _rate(db, test_user, hated, 1)
    _recipe(db, test_user, "Unrated Soup", ["leek"])
    db.add(PantryItem(user_id=test_user.id, name="spinach"))
    db.commit()

    context = rg.prefetch_user_context(test_user.id, db)

    assert context.dietary_restrictions == ["vegetarian"]
    assert context.preferred_cuisines == ["Thai", "Italian"]
    assert set(context.past_recipe_names) == {
        "Green Curry",
        "Liver Pate",
        "Unrated Soup",
    }
    assert context.liked_recipes == [
        {
            "name": "Green Curry",
            "cuisine": "Thai",
            "key_ingredients": ["coconut milk", "garlic"],
        }
    ]
    assert context.disliked_ingredients == ["liver"]
    assert context.pantry_names == ["spinach"]


def test_prefetch_user_context_for_new_user(db, test_user):
    context = rg.prefetch_user_context(test_user.id, db)

    assert context == rg.UserContext()


def test_build_recipe_prompt_includes_request_and_context():
    request = RecipeGenerationRequest(
        meal_type="dinner",
        difficulty="Easy",
        max_time_minutes=30,
        ingredients_to_use=["tofu", "spinach"],
        ingredients_to_avoid=["peanuts"],
        dietary_restrictions=["gluten-free"],
        servings=2,
        search_online=False,
        comments="Make it spicy",
    )
    context = rg.UserContext(
        dietary_restrictions=["vegetarian"],
        past_recipe_names=["Pad Thai"],
        liked_recipes=[
            {"name": "Green Curry", "cuisine": "Thai", "key_ingredients": []}
        ],
        disliked_ingredients=["liver"],
        nutritional_rules={"daily_calorie_target": 2000, "specific_goals": None},
        food_preferences={"cuisines": ["Thai"]},
        pantry_names=["rice"],
    )

    prompt = rg.build_recipe_prompt(request, context, "Thai")

    expected_lines = [
        f"- {rg.LABEL_DIETARY_PROFILE}: vegetarian",
        f"- {rg.LABEL_AVOID_RECIPES}: Pad Thai",
        f"- {rg.LABEL_LIKED}: Green Curry",
        f"- {rg.LABEL_AVOID_DISLIKED}: liver",
        f"- {rg.LABEL_NUTRITION}: Target calories: 2000",
        f"- {rg.LABEL_PREFERRED_CUISINES}: Thai",
        f"- {rg.LABEL_MEAL_TYPE}: dinner",
        f"- {rg.LABEL_CUISINE}: Thai",
        "IMPORTANT: This MUST be a Thai dish with authentic flavors.",
        f"- {rg.LABEL_DIFFICULTY}: easy",
        rg.DIFFICULTY_GUIDANCE["easy"],
        f"- {rg.LABEL_MAX_TIME}: 30 minutes",
        f"- {rg.LABEL_MUST_USE}: tofu, spinach",
        f"- {rg.LABEL_MUST_AVOID}: peanuts",
        f"- {rg.LABEL_PANTRY}: rice",
        f"- {rg.LABEL_DIETARY}: gluten-free",
        f"- {rg.LABEL_WEB}: disabled",
        f"- {rg.LABEL_SERVINGS}: 2",
    ]
    lines = prompt.splitlines()
    for line in expected_lines:
        assert line in lines
    assert [lines.index(line) for line in expected_lines] == sorted(
        lines.index(line) for line in expected_lines
    )
    assert prompt.endswith(f"{rg.LABEL_SPECIAL_REQUESTS}: Make it spicy")


def test_build_recipe_prompt_minimal_request_omits_empty_sections():
    prompt = rg.build_recipe_prompt(RecipeGenerationRequest(), rg.UserContext(), None)

    assert prompt.splitlines()[0] == "Please create a recipe with:"
    assert f"- {rg.LABEL_SERVINGS}: 4" in prompt
    assert f"- {rg.LABEL_WEB}: enabled" in prompt
    for label in (rg.LABEL_CUISINE, rg.LABEL_MUST_USE, rg.LABEL_NUTRITION, "IMPORTANT"):
        assert label not in prompt


def test_select_cuisine_prefers_request_then_preferences():
    context = rg.UserContext(food_preferences={"cuisines": ["Thai", "Greek"]})

    assert (
        rg.select_cuisine(RecipeGenerationRequest(cuisine="Mexican"), context)
        == "Mexican"
    )
    assert rg.select_cuisine(RecipeGenerationRequest(), context, random.Random(0)) in {
        "Thai",
        "Greek",
    }
    assert rg.select_cuisine(RecipeGenerationRequest(), rg.UserContext()) is None


@pytest.mark.parametrize(
    ("raw", "clean"),
    [
        ("Recipe: Pad Thai", "Pad Thai"),
        ("Recipe Name - Pad Thai", "Pad Thai"),
        ("## Pad Thai", "Pad Thai"),
        ("  Pad Thai ", "Pad Thai"),
        ("Recipe Box Soup", "Recipe Box Soup"),
    ],
)
def test_clean_recipe_name(raw, clean):
    assert rg.clean_recipe_name(raw) == clean


def test_save_generated_recipe_persists_all_fields(db, test_user):
    recipe_llm = RecipeLLM(
        name="Recipe: Lentil Soup",
        description="Hearty",
        cuisine="Turkish",
        ingredients=[{"name": "red lentils", "quantity": 1, "unit": "cup"}],
        instructions=["Simmer"],
        prep_time_minutes=5,
        cook_time_minutes=25,
        servings=4,
        tags=["vegan"],
        nutrition={"calories": 300, "protein_g": 18, "carbs_g": 45, "fat_g": 4},
    )

    saved = rg.save_generated_recipe(db, test_user.id, recipe_llm, "Easy")

    assert saved.id is not None
    assert saved.name == "Lentil Soup"
    assert saved.difficulty == "easy"
    assert saved.cuisine == "Turkish"
    assert saved.source == "ai_generated"
    assert saved.calories == 300
    assert saved.ingredients[0]["name"] == "red lentils"
