from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
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
    """Generate a new recipe using AI with streaming response"""

    def generate():
        try:
            # Send initial message
            yield f"data: {json.dumps({'type': 'status', 'message': 'Starting recipe generation...'})}\n\n"

            if request.search_online:
                yield f"data: {json.dumps({'type': 'status', 'message': 'Searching the web for recipe inspiration...'})}\n\n"

            # Stream the recipe generation
            accumulated_content = ""
            accumulated_thinking = ""

            stream_gen = recipe_agent.generate_recipe_stream(request, current_user, db)
            recipe_json_text = ""

            # Process the stream - it now returns the JSON text when complete
            for result in stream_gen:
                if isinstance(result, str) and not result.startswith("data: "):
                    # This is the final JSON text
                    recipe_json_text = result
                    break
                else:
                    # This is a streaming chunk
                    yield result

                    # Parse the chunk to accumulate content for final processing
                    try:
                        if result.startswith("data: "):
                            chunk_json = json.loads(result[6:].strip())
                            if chunk_json.get("type") == "content":
                                accumulated_content += chunk_json.get("chunk", "")
                            elif chunk_json.get("type") == "thinking":
                                accumulated_thinking += chunk_json.get("chunk", "")
                    except (json.JSONDecodeError, ValueError):
                        # If parsing fails, continue - the chunk will still be sent to client
                        pass

            # Try to parse the JSON to extract recipe data
            try:
                # Use the returned JSON text, or fall back to accumulated content
                json_to_parse = (
                    recipe_json_text if recipe_json_text else accumulated_content
                )

                # Add debugging info
                if not json_to_parse or not json_to_parse.strip():
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Empty JSON content received from recipe generation'})}\n\n"
                    return

                # Log what we're trying to parse
                print(
                    f"🔧 DEBUG: Attempting to parse JSON text (length: {len(json_to_parse)})"
                )
                print(f"🔧 DEBUG: First 300 chars: {json_to_parse[:300]}...")

                recipe_data = recipe_agent._extract_json_from_response(json_to_parse)

                if recipe_data:
                    # Add debugging info about what we parsed
                    print(
                        f"✅ DEBUG: Successfully parsed recipe data with keys: {list(recipe_data.keys())}"
                    )

                    # Validate required fields
                    required_fields = ["name", "ingredients", "instructions"]
                    missing_fields = [
                        field for field in required_fields if field not in recipe_data
                    ]

                    if missing_fields:
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Recipe missing required fields: {missing_fields}'})}\n\n"
                        return

                    # Save the generated recipe to database
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
                        source=recipe_data.get("source", "ai_generated"),
                        source_urls=recipe_data.get("source_urls", []),
                        # Nutrition
                        calories=recipe_data.get("nutrition", {}).get("calories"),
                        protein_g=recipe_data.get("nutrition", {}).get("protein_g"),
                        carbs_g=recipe_data.get("nutrition", {}).get("carbs_g"),
                        fat_g=recipe_data.get("nutrition", {}).get("fat_g"),
                        fiber_g=recipe_data.get("nutrition", {}).get("fiber_g"),
                        sugar_g=recipe_data.get("nutrition", {}).get("sugar_g"),
                        sodium_mg=recipe_data.get("nutrition", {}).get("sodium_mg"),
                    )

                    db.add(db_recipe)
                    db.commit()
                    db.refresh(db_recipe)

                    # Send completion message with recipe ID
                    yield f"data: {json.dumps({'type': 'complete', 'recipe_id': db_recipe.id, 'message': 'Recipe generated and saved successfully!', 'thinking_length': len(accumulated_thinking)})}\n\n"
                else:
                    # More detailed error message
                    yield f"data: {json.dumps({'type': 'error', 'message': f'Could not extract valid recipe from generated content. Content length: {len(json_to_parse)}. Please try generating again.'})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to save recipe: {str(e)}'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to generate recipe: {str(e)}'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
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
    """Generate a new recipe using AI based on user preferences"""
    try:
        recipe_data = recipe_agent.generate_recipe(request, current_user, db)

        # Save the generated recipe
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
            # Nutrition
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


@router.get("/", response_model=List[Recipe])
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

    update_data = recipe_update.dict(exclude_unset=True)
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
        # Import here to avoid circular imports
        from app.models.meal_plan import MealPlanItem

        # Delete related meal plan items first
        db.query(MealPlanItem).filter(MealPlanItem.recipe_id == recipe_id).delete()

        # Delete related feedback
        db.query(RecipeFeedbackModel).filter(
            RecipeFeedbackModel.recipe_id == recipe_id
        ).delete()

        # Delete the recipe
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
    # Check if recipe exists
    recipe = db.query(RecipeModel).filter(RecipeModel.id == recipe_id).first()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    # Check if feedback already exists
    existing = (
        db.query(RecipeFeedbackModel)
        .filter(
            RecipeFeedbackModel.user_id == current_user.id,
            RecipeFeedbackModel.recipe_id == recipe_id,
        )
        .first()
    )

    if existing:
        # Update existing feedback
        existing.liked = feedback.liked
        existing.rating = feedback.rating
        existing.notes = feedback.notes
        db.commit()
        db.refresh(existing)
        return existing

    # Create new feedback
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
