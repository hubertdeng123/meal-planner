"""Tests for the offline demo LLM."""

import random
import time

import pytest

from app.agents.demo_model import (
    build_demo_model,
    build_demo_recipe,
    build_demo_thinking,
    choose_dish,
    parse_brief,
)
from app.agents.pydantic_recipe_agent import build_recipe_agent
from app.schemas.llm_response import RecipeLLM
from app.schemas.recipe import RecipeGenerationRequest
from app.services.recipe_generation import UserContext, build_recipe_prompt


def _brief(request: RecipeGenerationRequest, context: UserContext | None = None):
    return parse_brief(
        build_recipe_prompt(request, context or UserContext(), request.cuisine)
    )


def _generate(request: RecipeGenerationRequest, context: UserContext | None = None):
    brief = _brief(request, context)
    dish = choose_dish(brief, random.Random(7))
    recipe = build_demo_recipe(brief, dish)
    return brief, dish, RecipeLLM.model_validate(recipe)


def test_parse_brief_round_trips_prompt_fields():
    brief = _brief(
        RecipeGenerationRequest(
            meal_type="Dinner",
            cuisine="Thai",
            difficulty="hard",
            max_time_minutes=40,
            ingredients_to_use=["tofu", "spinach"],
            ingredients_to_avoid=["peanuts"],
            dietary_restrictions=["vegan"],
            servings=6,
        ),
        UserContext(past_recipe_names=["Pad Thai"], pantry_names=["rice"]),
    )

    assert brief.meal_type == "dinner"
    assert brief.cuisine == "Thai"
    assert brief.difficulty == "hard"
    assert brief.max_minutes == 40
    assert brief.servings == 6
    assert brief.must_use == ["tofu", "spinach"]
    assert brief.avoid == ["peanuts"]
    assert brief.dietary == ["vegan"]
    assert brief.avoid_recipes == ["pad thai"]
    assert brief.pantry == ["rice"]


def test_demo_recipe_follows_request():
    _, _, recipe = _generate(
        RecipeGenerationRequest(
            meal_type="dinner",
            cuisine="Thai",
            ingredients_to_use=["tofu", "bok choy"],
            ingredients_to_avoid=["garlic"],
            servings=2,
            max_time_minutes=20,
        ),
        UserContext(dietary_restrictions=["vegetarian"]),
    )
    names = [ing.name for ing in recipe.ingredients]

    assert recipe.cuisine == "Thai"
    assert recipe.servings == 2
    assert "tofu" in recipe.name.lower()
    assert (
        "chicken" not in " ".join(names + [recipe.name, *recipe.instructions]).lower()
    )
    assert any("tofu" in n for n in names) and "bok choy" in names
    assert not any("garlic" in n for n in names)
    assert recipe.prep_time_minutes + recipe.cook_time_minutes <= 20
    assert "vegetarian" in recipe.tags and "dinner" in recipe.tags


def test_demo_avoids_recipes_the_user_already_has():
    request = RecipeGenerationRequest(
        cuisine="Thai",
        ingredients_to_use=["spinach"],
        dietary_restrictions=["vegetarian"],
    )
    _, _, first = _generate(request)

    _, _, second = _generate(request, UserContext(past_recipe_names=[first.name]))

    assert second.name != first.name
    assert second.cuisine == "Thai"


def test_demo_recipe_scales_with_servings():
    request = RecipeGenerationRequest(cuisine="Indian")
    _, _, two = _generate(request.model_copy(update={"servings": 2}))
    _, _, eight = _generate(request.model_copy(update={"servings": 8}))

    assert two.name == eight.name
    assert eight.ingredients[0].quantity > two.ingredients[0].quantity


@pytest.mark.parametrize("meal_type", ["breakfast", "lunch", "dinner", "snack"])
def test_demo_recipe_matches_meal_type(meal_type):
    _, dish, recipe = _generate(RecipeGenerationRequest(meal_type=meal_type))

    assert meal_type in dish.meal_types
    assert meal_type in recipe.tags


def test_demo_vegan_avoids_animal_products():
    _, _, recipe = _generate(
        RecipeGenerationRequest(cuisine="Japanese", dietary_restrictions=["vegan"])
    )
    text = " ".join(i.name for i in recipe.ingredients).lower()

    for word in ("salmon", "egg", "milk", "feta", "yogurt"):
        assert word not in text or f"coconut {word}" in text


def test_unknown_cuisine_is_still_honoured():
    _, _, recipe = _generate(
        RecipeGenerationRequest(cuisine="Korean", ingredients_to_use=["kimchi"])
    )

    assert recipe.cuisine == "Korean"
    assert recipe.name.startswith("Korean-Style ")
    assert "Thai" not in recipe.name


def test_demo_thinking_mentions_the_brief():
    brief, dish, recipe = _generate(
        RecipeGenerationRequest(
            meal_type="lunch",
            cuisine="Mexican",
            ingredients_to_use=["corn"],
            servings=3,
        )
    )

    thinking = build_demo_thinking(brief, dish, recipe.model_dump())

    assert "lunch for 3 people" in thinking
    assert "Mexican" in thinking
    assert "corn" in thinking
    assert recipe.name in thinking


@pytest.mark.asyncio
async def test_demo_agent_streams_thinking_and_output_with_realistic_timing():
    agent = build_recipe_agent(build_demo_model(delay_scale=0.05))
    prompt = build_recipe_prompt(
        RecipeGenerationRequest(meal_type="dinner", servings=2), UserContext(), None
    )

    started = time.monotonic()
    result = await agent.run(prompt)
    assert isinstance(result.output, RecipeLLM)

    thinking_parts = []
    async with agent.iter(prompt) as run:
        async for node in run:
            if agent.is_model_request_node(node):
                async with node.stream(run.ctx) as stream:
                    async for _ in stream:
                        pass
                    thinking_parts = [
                        p for p in stream.response.parts if p.part_kind == "thinking"
                    ]
    elapsed = time.monotonic() - started

    assert run.result.output.servings == 2
    assert thinking_parts and len(thinking_parts[0].content) > 100
    # 0.05x of the ~6-10s target, so the full-speed run lands in that window.
    assert 0.2 < elapsed < 1.0
