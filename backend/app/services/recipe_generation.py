"""User context, prompt building, and persistence for AI recipe generation.

Everything the model needs is gathered here in a few SQL queries before the LLM call, so the
agent never has to call tools for context.
"""

import random
import re
from dataclasses import dataclass, field
from typing import TypedDict

from sqlalchemy.orm import Session

from app.models import (
    PantryItem as PantryItemModel,
    Recipe as RecipeModel,
    RecipeFeedback as RecipeFeedbackModel,
    User,
)
from app.schemas.llm_response import RecipeLLM
from app.schemas.recipe import RecipeGenerationRequest

PAST_RECIPE_LIMIT = 20
LIKED_RECIPE_LIMIT = 10
PANTRY_LIMIT = 20

# Prompt line labels. The demo model parses these back out, so keep them stable.
LABEL_DIETARY_PROFILE = "Dietary Restrictions"
LABEL_AVOID_RECIPES = (
    "AVOID these existing recipes (create something completely different)"
)
LABEL_LIKED = "You've enjoyed these recipes before (similar flavors work well)"
LABEL_AVOID_DISLIKED = "AVOID these ingredients"
LABEL_NUTRITION = "Nutritional Goals"
LABEL_PREFERRED_CUISINES = "Preferred cuisines"
LABEL_MEAL_TYPE = "Meal Type"
LABEL_CUISINE = "Cuisine"
LABEL_DIFFICULTY = "Difficulty"
LABEL_MAX_TIME = "Max Time"
LABEL_MUST_USE = "Must Use"
LABEL_MUST_AVOID = "Must Avoid"
LABEL_PANTRY = "Pantry On Hand"
LABEL_DIETARY = "Dietary"
LABEL_WEB = "Web Inspiration"
LABEL_SERVINGS = "Servings"
LABEL_SPECIAL_REQUESTS = "Special Requests"

DIFFICULTY_GUIDANCE = {
    "easy": "EASY recipe with simple techniques, minimal prep, common ingredients",
    "medium": "MEDIUM difficulty with some cooking techniques and moderate prep",
    "hard": "HARD recipe with advanced techniques and longer preparation",
}

_NAME_PREFIX = re.compile(r"^\s*(?:recipe(?:\s+name)?\s*[:\-–—]\s*|[:\-–—*#\s]+)", re.I)


class LikedRecipe(TypedDict):
    name: str
    cuisine: str | None
    key_ingredients: list[str]


@dataclass(frozen=True)
class UserContext:
    """Everything about the user that shapes a generated recipe."""

    dietary_restrictions: list[str] = field(default_factory=list)
    food_preferences: dict = field(default_factory=dict)
    nutritional_rules: dict = field(default_factory=dict)
    past_recipe_names: list[str] = field(default_factory=list)
    liked_recipes: list[LikedRecipe] = field(default_factory=list)
    disliked_ingredients: list[str] = field(default_factory=list)
    pantry_names: list[str] = field(default_factory=list)

    @property
    def preferred_cuisines(self) -> list[str]:
        return list(self.food_preferences.get("cuisines") or [])


def prefetch_user_context(user_id: int, db: Session) -> UserContext:
    """Load preferences, recent history, feedback and pantry for prompt building.

    Uses four small queries; feedback is fetched once and split into liked/disliked in Python.
    """
    user = db.query(User).filter(User.id == user_id).first()

    past_recipe_names = [
        name
        for (name,) in db.query(RecipeModel.name)
        .filter(RecipeModel.user_id == user_id)
        .order_by(RecipeModel.created_at.desc())
        .limit(PAST_RECIPE_LIMIT)
        .all()
    ]

    rated = (
        db.query(RecipeModel, RecipeFeedbackModel.rating)
        .join(RecipeFeedbackModel, RecipeFeedbackModel.recipe_id == RecipeModel.id)
        .filter(
            RecipeModel.user_id == user_id,
            RecipeFeedbackModel.user_id == user_id,
            RecipeFeedbackModel.rating.isnot(None),
        )
        .order_by(RecipeFeedbackModel.rating.desc())
        .all()
    )

    liked: list[LikedRecipe] = []
    liked_ingredients: set[str] = set()
    disliked_ingredients: set[str] = set()
    for recipe, rating in rated:
        names = [
            (ing.get("name") or "").strip().lower()
            for ing in recipe.ingredients or []
            if isinstance(ing, dict)
        ]
        names = [name for name in names if name]
        if rating >= 4:
            liked_ingredients.update(names)
            if len(liked) < LIKED_RECIPE_LIMIT:
                liked.append(
                    {
                        "name": recipe.name,
                        "cuisine": recipe.cuisine,
                        "key_ingredients": names[:5],
                    }
                )
        elif rating <= 2:
            disliked_ingredients.update(names)

    pantry_names = [
        name
        for (name,) in db.query(PantryItemModel.name)
        .filter(PantryItemModel.user_id == user_id)
        .order_by(PantryItemModel.updated_at.desc())
        .limit(PANTRY_LIMIT)
        .all()
    ]

    return UserContext(
        dietary_restrictions=list(user.dietary_restrictions or []) if user else [],
        food_preferences=dict(user.food_preferences or {}) if user else {},
        nutritional_rules=dict(user.nutritional_rules or {}) if user else {},
        past_recipe_names=past_recipe_names,
        liked_recipes=liked,
        # Staples that appear in recipes the user loved are not really "disliked".
        disliked_ingredients=sorted(disliked_ingredients - liked_ingredients),
        pantry_names=pantry_names,
    )


def select_cuisine(
    request: RecipeGenerationRequest,
    context: UserContext,
    rng: random.Random | None = None,
) -> str | None:
    """Use the requested cuisine, else pick one of the user's preferred cuisines."""
    if request.cuisine:
        return request.cuisine
    cuisines = context.preferred_cuisines
    if not cuisines:
        return None
    return (rng or random).choice(cuisines)


def format_nutritional_goals(rules: dict) -> str:
    """Format nutritional rules as readable text, skipping empty values."""
    parts = []
    if rules.get("daily_calorie_target"):
        parts.append(f"Target calories: {rules['daily_calorie_target']}")
    if rules.get("daily_calorie_range"):
        parts.append(f"Calorie range: {rules['daily_calorie_range']}")
    if rules.get("macro_targets"):
        parts.append(f"Macro targets: {rules['macro_targets']}")
    if rules.get("specific_goals"):
        parts.append(f"Goals: {rules['specific_goals']}")
    return ", ".join(parts)


def build_recipe_prompt(
    request: RecipeGenerationRequest,
    context: UserContext,
    cuisine: str | None,
) -> str:
    """Build the user prompt from the request plus prefetched user context."""
    lines = ["Please create a recipe with:\n"]

    def add(label: str, value: object) -> None:
        lines.append(f"- {label}: {value}")

    if context.dietary_restrictions:
        add(LABEL_DIETARY_PROFILE, ", ".join(context.dietary_restrictions))
    if context.past_recipe_names:
        add(LABEL_AVOID_RECIPES, ", ".join(context.past_recipe_names))
    if context.liked_recipes:
        add(LABEL_LIKED, ", ".join(r["name"] for r in context.liked_recipes[:5]))
    if context.disliked_ingredients:
        add(LABEL_AVOID_DISLIKED, ", ".join(context.disliked_ingredients[:10]))
    goals = format_nutritional_goals(context.nutritional_rules)
    if goals:
        add(LABEL_NUTRITION, goals)
    if context.preferred_cuisines:
        add(LABEL_PREFERRED_CUISINES, ", ".join(context.preferred_cuisines))

    if request.meal_type:
        add(LABEL_MEAL_TYPE, request.meal_type)
    if cuisine:
        add(LABEL_CUISINE, cuisine)
        lines.append(
            f"IMPORTANT: This MUST be a {cuisine} dish with authentic flavors."
        )
    if request.difficulty:
        difficulty = request.difficulty.lower()
        add(LABEL_DIFFICULTY, difficulty)
        if difficulty in DIFFICULTY_GUIDANCE:
            lines.append(DIFFICULTY_GUIDANCE[difficulty])
    if request.max_time_minutes:
        add(LABEL_MAX_TIME, f"{request.max_time_minutes} minutes")
    if request.ingredients_to_use:
        add(LABEL_MUST_USE, ", ".join(request.ingredients_to_use))
    if request.ingredients_to_avoid:
        add(LABEL_MUST_AVOID, ", ".join(request.ingredients_to_avoid))
    if context.pantry_names:
        add(LABEL_PANTRY, ", ".join(context.pantry_names[:12]))
    if request.dietary_restrictions:
        add(LABEL_DIETARY, ", ".join(request.dietary_restrictions))
    add(LABEL_WEB, "enabled" if request.search_online else "disabled")
    add(LABEL_SERVINGS, request.servings)
    if request.comments:
        lines.append(f"\n{LABEL_SPECIAL_REQUESTS}: {request.comments}")

    return "\n".join(lines)


def clean_recipe_name(name: str) -> str:
    """Strip labels like "Recipe:" or stray leading punctuation from a model-written title."""
    cleaned = _NAME_PREFIX.sub("", name or "", count=1).strip()
    return cleaned or (name or "").strip()


def save_generated_recipe(
    db: Session,
    user_id: int,
    recipe_llm: RecipeLLM,
    difficulty: str | None,
) -> RecipeModel:
    """Persist a validated model output as a new recipe owned by ``user_id``."""
    nutrition = recipe_llm.nutrition
    recipe = RecipeModel(
        user_id=user_id,
        name=clean_recipe_name(recipe_llm.name),
        description=recipe_llm.description,
        cuisine=recipe_llm.cuisine,
        difficulty=(difficulty or "medium").lower(),
        instructions=recipe_llm.instructions,
        ingredients=[ing.model_dump() for ing in recipe_llm.ingredients],
        prep_time_minutes=recipe_llm.prep_time_minutes,
        cook_time_minutes=recipe_llm.cook_time_minutes,
        servings=recipe_llm.servings,
        tags=recipe_llm.tags,
        source="ai_generated",
        source_urls=recipe_llm.source_urls,
        calories=nutrition.calories,
        protein_g=nutrition.protein_g,
        carbs_g=nutrition.carbs_g,
        fat_g=nutrition.fat_g,
        fiber_g=nutrition.fiber_g,
        sugar_g=nutrition.sugar_g,
        sodium_mg=nutrition.sodium_mg,
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe
