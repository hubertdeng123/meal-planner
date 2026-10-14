"""Shared conversion of recipe ORM rows into API response payloads."""

from app.models import Recipe as RecipeModel, RecipeFeedback as RecipeFeedbackModel


def total_minutes(recipe: RecipeModel) -> int | None:
    """Return prep + cook minutes, or None when neither is recorded."""
    if recipe.prep_time_minutes is None and recipe.cook_time_minutes is None:
        return None
    return (recipe.prep_time_minutes or 0) + (recipe.cook_time_minutes or 0)


def format_feedback_response(feedback: RecipeFeedbackModel) -> dict:
    """Format a feedback row as a `RecipeFeedback` payload."""
    return {
        "id": feedback.id,
        "user_id": feedback.user_id,
        "recipe_id": feedback.recipe_id,
        "liked": bool(feedback.liked),
        "rating": feedback.rating,
        "notes": feedback.notes,
        "created_at": feedback.created_at,
        "updated_at": feedback.updated_at,
    }


def find_user_feedback(recipe: RecipeModel, user_id: int) -> RecipeFeedbackModel | None:
    """Pick the given user's feedback from a recipe's loaded feedback rows."""
    for feedback in recipe.recipe_feedbacks or []:
        if feedback.user_id == user_id:
            return feedback
    return None


def format_recipe_response(
    recipe: RecipeModel, feedback: RecipeFeedbackModel | None = None
) -> dict:
    """Format a recipe row as a `Recipe` payload (the shape of GET /recipes/{id})."""
    return {
        "id": recipe.id,
        "user_id": recipe.user_id,
        "name": recipe.name,
        "description": recipe.description,
        "instructions": recipe.instructions or [],
        "ingredients": recipe.ingredients or [],
        "prep_time_minutes": recipe.prep_time_minutes,
        "cook_time_minutes": recipe.cook_time_minutes,
        "total_minutes": total_minutes(recipe),
        "servings": recipe.servings,
        "tags": recipe.tags or [],
        "cuisine": recipe.cuisine,
        "difficulty": recipe.difficulty,
        "nutrition": {
            "calories": recipe.calories,
            "protein_g": recipe.protein_g,
            "carbs_g": recipe.carbs_g,
            "fat_g": recipe.fat_g,
            "fiber_g": recipe.fiber_g,
            "sugar_g": recipe.sugar_g,
            "sodium_mg": recipe.sodium_mg,
        },
        "source": recipe.source,
        "source_urls": recipe.source_urls or [],
        "image_url": recipe.image_url,
        "created_at": recipe.created_at,
        "feedback": format_feedback_response(feedback) if feedback else None,
    }
