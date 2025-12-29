from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
from app.db.database import get_db
from app.api.deps import get_current_active_user
from app.models import (
    User,
    Recipe as RecipeModel,
    RecipeFeedback as RecipeFeedbackModel,
)
from app.schemas.recipe import (
    Recipe,
    RecipeUpdate,
    RecipeGenerationRequest,
    RecipeFeedbackCreate,
    RecipeFeedback,
)
from app.agents.recipe_agent import RecipeAgent

router = APIRouter()
recipe_agent = RecipeAgent()


@router.post("/generate/stream")
async def generate_recipe_stream(
    request: RecipeGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Generate recipe with guaranteed valid JSON using Together API structured output.

    Uses Llama 4 Maverick with JSON Schema mode to ensure all responses conform to RecipeLLM
    Pydantic schema. The agent handles all validation, parsing, and database operations.
    Streams SSE events for real-time feedback during generation.
    """

    def generate():
        try:
            yield f"data: {json.dumps({'type': 'status', 'message': 'Starting recipe generation...'})}\n\n"

            # Agent handles everything: validation, parsing, saving
            # Just pass through all SSE events from the generator
            for result in recipe_agent.generate_recipe_stream(
                request, current_user, db
            ):
                yield result

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to generate recipe: {str(e)}'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


@router.post("/generate", response_model=Recipe)
async def generate_recipe(
    request: RecipeGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Generate recipe with guaranteed valid JSON using Together API structured output (non-streaming).

    Uses Llama 4 Maverick with JSON Schema mode to ensure all responses conform to RecipeLLM
    Pydantic schema. Agent validates and formats the response, endpoint saves to database.
    """
    try:
        recipe_data = recipe_agent.generate_recipe(request, current_user, db)

        db_recipe = RecipeModel(
            user_id=current_user.id,
            name=recipe_data["name"],
            description=recipe_data.get("description"),
            instructions=recipe_data["instructions"],
            ingredients=[ing for ing in recipe_data["ingredients"]],
            prep_time_minutes=recipe_data.get("prep_time_minutes"),
            cook_time_minutes=recipe_data.get("cook_time_minutes"),
            servings=recipe_data["servings"],
            tags=recipe_data.get("tags", []),
            source=recipe_data["source"],
            source_urls=recipe_data.get("source_urls", []),
            calories=recipe_data["nutrition"].get("calories"),
            protein_g=recipe_data["nutrition"].get("protein_g"),
            carbs_g=recipe_data["nutrition"].get("carbs_g"),
            fat_g=recipe_data["nutrition"].get("fat_g"),
            fiber_g=recipe_data["nutrition"].get("fiber_g"),
            sugar_g=recipe_data["nutrition"].get("sugar_g"),
            sodium_mg=recipe_data["nutrition"].get("sodium_mg"),
        )

        db.add(db_recipe)
        db.commit()
        db.refresh(db_recipe)

        return _format_recipe_response(db_recipe)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recipe: {str(e)}",
        )


@router.get("/", response_model=list[Recipe])
async def get_recipes(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's recipes"""
    recipes = (
        db.query(RecipeModel)
        .filter(RecipeModel.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [_format_recipe_response(recipe) for recipe in recipes]


@router.get("/{recipe_id}", response_model=Recipe)
async def get_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific recipe"""
    recipe = (
        db.query(RecipeModel)
        .filter(RecipeModel.id == recipe_id, RecipeModel.user_id == current_user.id)
        .first()
    )

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    return _format_recipe_response(recipe)


@router.put("/{recipe_id}", response_model=Recipe)
async def update_recipe(
    recipe_id: int,
    recipe_update: RecipeUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a recipe"""
    recipe = (
        db.query(RecipeModel)
        .filter(RecipeModel.id == recipe_id, RecipeModel.user_id == current_user.id)
        .first()
    )

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    update_data = recipe_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(recipe, field, value)

    db.commit()
    db.refresh(recipe)

    return _format_recipe_response(recipe)


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a recipe"""
    recipe = (
        db.query(RecipeModel)
        .filter(RecipeModel.id == recipe_id, RecipeModel.user_id == current_user.id)
        .first()
    )

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    try:
        from app.models.meal_plan import MealPlanItem

        db.query(MealPlanItem).filter(MealPlanItem.recipe_id == recipe_id).delete()
        db.query(RecipeFeedbackModel).filter(
            RecipeFeedbackModel.recipe_id == recipe_id
        ).delete()
        db.delete(recipe)
        db.commit()

        return {"detail": "Recipe deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete recipe: {str(e)}",
        )


@router.post("/{recipe_id}/feedback", response_model=RecipeFeedback)
async def add_recipe_feedback(
    recipe_id: int,
    feedback: RecipeFeedbackCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Add feedback for a recipe"""
    recipe = db.query(RecipeModel).filter(RecipeModel.id == recipe_id).first()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    existing = (
        db.query(RecipeFeedbackModel)
        .filter(
            RecipeFeedbackModel.user_id == current_user.id,
            RecipeFeedbackModel.recipe_id == recipe_id,
        )
        .first()
    )

    if existing:
        existing.liked = feedback.liked
        existing.rating = feedback.rating
        existing.notes = feedback.notes
        db.commit()
        db.refresh(existing)
        return existing

    db_feedback = RecipeFeedbackModel(
        user_id=current_user.id,
        recipe_id=recipe_id,
        liked=feedback.liked,
        rating=feedback.rating,
        notes=feedback.notes,
    )

    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)

    return db_feedback


def _format_recipe_response(recipe: RecipeModel) -> dict:
    """Format recipe model to response schema"""
    return {
        "id": recipe.id,
        "user_id": recipe.user_id,
        "name": recipe.name,
        "description": recipe.description,
        "instructions": recipe.instructions,
        "ingredients": recipe.ingredients,
        "prep_time_minutes": recipe.prep_time_minutes,
        "cook_time_minutes": recipe.cook_time_minutes,
        "servings": recipe.servings,
        "tags": recipe.tags or [],
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
        "source_urls": recipe.source_urls,
        "image_url": recipe.image_url,
        "created_at": recipe.created_at,
    }
