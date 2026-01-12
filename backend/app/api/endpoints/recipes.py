from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
import json
import logging
import random
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
from app.agents.pydantic_recipe_agent import recipe_agent
from app.agents.recipe_deps import RecipeAgentDeps

router = APIRouter()
logger = logging.getLogger(__name__)


def prefetch_user_context(user_id: int, db: Session) -> dict:
    """Prefetch all user context data to avoid slow LLM tool calls"""
    # Get user preferences
    user = db.query(User).filter(User.id == user_id).first()
    preferences = {
        "food_preferences": user.food_preferences or {} if user else {},
        "dietary_restrictions": user.dietary_restrictions or {} if user else {},
        "ingredient_rules": user.ingredient_rules or {} if user else {},
        "nutritional_rules": user.nutritional_rules or {} if user else {},
    }

    # Get past recipes (to avoid duplicates)
    past_recipes = (
        db.query(RecipeModel)
        .filter(RecipeModel.user_id == user_id)
        .order_by(RecipeModel.created_at.desc())
        .limit(20)
        .all()
    )
    past_recipe_names = [r.name for r in past_recipes]

    # Get liked recipes
    liked_recipes = (
        db.query(RecipeModel)
        .join(RecipeFeedbackModel)
        .filter(and_(RecipeModel.user_id == user_id, RecipeFeedbackModel.rating >= 4))
        .order_by(RecipeFeedbackModel.rating.desc())
        .limit(10)
        .all()
    )
    liked_info = [
        {
            "name": r.name,
            "cuisine": r.cuisine,
            "key_ingredients": [ing.get("name") for ing in (r.ingredients or [])[:5]],
        }
        for r in liked_recipes
    ]

    # Get disliked ingredients
    disliked_recipes = (
        db.query(RecipeModel)
        .join(RecipeFeedbackModel)
        .filter(and_(RecipeModel.user_id == user_id, RecipeFeedbackModel.rating <= 2))
        .all()
    )
    disliked_ingredients = set()
    for recipe in disliked_recipes:
        if recipe.ingredients:
            for ing in recipe.ingredients:
                disliked_ingredients.add(ing.get("name", "").lower())

    return {
        "preferences": preferences,
        "past_recipe_names": past_recipe_names,
        "liked_recipes": liked_info,
        "disliked_ingredients": sorted(list(disliked_ingredients)),
    }


def _select_random_cuisine(request: RecipeGenerationRequest, user: User) -> str | None:
    if request.cuisine:
        return request.cuisine
    preferences = user.food_preferences or {}
    cuisines = preferences.get("cuisines") or []
    return random.choice(cuisines) if cuisines else None


@router.post("/generate/stream")
async def generate_recipe_stream(
    request: RecipeGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generate recipe with streaming using PydanticAI + tools"""

    async def event_stream():
        # Prefetch user context (fast - all queries at once, no LLM tool calls needed)
        user_context = prefetch_user_context(current_user.id, db)

        selected_cuisine = _select_random_cuisine(request, current_user)

        # Build user prompt with prefetched context
        prompt_parts = ["Please create a recipe with:\n"]

        # Include user preferences in prompt
        if user_context["preferences"]["dietary_restrictions"]:
            prompt_parts.append(
                f"- Dietary Restrictions: {user_context['preferences']['dietary_restrictions']}"
            )

        # Include past recipes to avoid duplicates
        if user_context["past_recipe_names"]:
            prompt_parts.append(
                f"- AVOID these existing recipes (create something different): {', '.join(user_context['past_recipe_names'][:10])}"
            )

        # Include liked recipes for inspiration
        if user_context["liked_recipes"]:
            liked_names = [r["name"] for r in user_context["liked_recipes"][:5]]
            prompt_parts.append(
                f"- You've enjoyed these recipes before (similar flavors work well): {', '.join(liked_names)}"
            )

        # Include disliked ingredients
        if user_context["disliked_ingredients"]:
            prompt_parts.append(
                f"- AVOID these ingredients: {', '.join(user_context['disliked_ingredients'][:10])}"
            )

        # Include nutritional goals/preferences
        if user_context["preferences"]["nutritional_rules"]:
            prompt_parts.append(
                f"- Nutritional Goals: {user_context['preferences']['nutritional_rules']}"
            )

        prompt_parts.append("- Choose a cuisine from the user's saved preferences")
        if user_context["preferences"]["food_preferences"].get("cuisines"):
            prompt_parts.append(
                f"- Preferred cuisines: {user_context['preferences']['food_preferences']['cuisines']}"
            )
        if request.meal_type:
            prompt_parts.append(f"- Meal Type: {request.meal_type}")
        if selected_cuisine:
            prompt_parts.append(f"- Cuisine: {selected_cuisine}")
            prompt_parts.append(
                f"IMPORTANT: This MUST be a {selected_cuisine} dish with authentic flavors."
            )
        if request.difficulty:
            difficulty_map = {
                "easy": "EASY recipe with simple techniques, minimal prep, common ingredients",
                "medium": "MEDIUM difficulty with some cooking techniques and moderate prep",
                "hard": "HARD recipe with advanced techniques and longer preparation",
            }
            prompt_parts.append(difficulty_map.get(request.difficulty.lower(), ""))
        if request.max_time_minutes:
            prompt_parts.append(f"- Max Time: {request.max_time_minutes} minutes")
        if request.ingredients_to_use:
            prompt_parts.append(f"- Must Use: {', '.join(request.ingredients_to_use)}")
        if request.dietary_restrictions:
            prompt_parts.append(f"- Dietary: {', '.join(request.dietary_restrictions)}")
        prompt_parts.append(f"- Servings: {request.servings}")
        if request.comments:
            prompt_parts.append(f"\nSpecial Requests: {request.comments}")

        user_prompt = "\n".join(prompt_parts)

        # Create dependencies (sync Session + user ID)
        deps = RecipeAgentDeps(db=db, user_id=current_user.id)

        try:
            yield f"data: {json.dumps({'type': 'status', 'message': 'Starting recipe generation...'})}\n\n"

            logger.info("Recipe generation started with Kimi K2 Thinking")

            # Stream with thinking tokens
            recipe_llm = None
            in_thinking = False

            async with recipe_agent.run_stream(user_prompt, deps=deps) as result:
                # Use .stream() to iterate over response events (works with structured output)
                # Kimi K2 outputs <think>...</think> before the tool call
                async for event in result.stream():
                    # Check if event has text content (thinking comes as text before tool call)
                    if hasattr(event, "content") and isinstance(event.content, str):
                        content = event.content

                        if "<think>" in content:
                            in_thinking = True
                            yield f"data: {json.dumps({'type': 'thinking_start'})}\n\n"
                            content = content.split("<think>", 1)[-1]

                        if "</think>" in content:
                            before_end = content.split("</think>", 1)[0]
                            if before_end.strip():
                                yield f"data: {json.dumps({'type': 'thinking', 'content': before_end})}\n\n"
                            in_thinking = False
                            yield f"data: {json.dumps({'type': 'thinking_end'})}\n\n"
                            # Content after </think> is the tool call, not text - safe to skip
                            continue

                        if in_thinking and content.strip():
                            yield f"data: {json.dumps({'type': 'thinking', 'content': content})}\n\n"

                # Get the final structured output (type-safe RecipeLLM)
                recipe_llm = await result.get_output()

            if not recipe_llm:
                logger.error("Recipe generation returned None")
                yield f"data: {json.dumps({'type': 'error', 'message': 'Recipe generation failed - no output received'})}\n\n"
                return

            logger.info(
                "Recipe generation complete: ingredients=%s instructions=%s nutrition=%s",
                len(recipe_llm.ingredients or []),
                len(recipe_llm.instructions or []),
                bool(recipe_llm.nutrition),
            )

            # Now stream the complete recipe field-by-field (happens instantly)
            yield f"data: {json.dumps({'type': 'recipe_start'})}\n\n"

            yield f"data: {json.dumps({'type': 'recipe_name', 'content': recipe_llm.name})}\n\n"

            yield f"data: {json.dumps({'type': 'recipe_description', 'content': recipe_llm.description})}\n\n"

            yield f"data: {json.dumps({'type': 'recipe_metadata', 'content': {'prep_time': recipe_llm.prep_time_minutes, 'cook_time': recipe_llm.cook_time_minutes, 'servings': recipe_llm.servings}})}\n\n"

            yield f"data: {json.dumps({'type': 'ingredients_start'})}\n\n"
            for ingredient in recipe_llm.ingredients:
                yield f"data: {json.dumps({'type': 'ingredient', 'content': {'name': ingredient.name, 'quantity': ingredient.quantity, 'unit': ingredient.unit, 'notes': ingredient.notes}})}\n\n"

            yield f"data: {json.dumps({'type': 'instructions_start'})}\n\n"
            for idx, instruction in enumerate(recipe_llm.instructions, 1):
                yield f"data: {json.dumps({'type': 'instruction', 'step': idx, 'content': instruction})}\n\n"

            yield f"data: {json.dumps({'type': 'nutrition', 'content': recipe_llm.nutrition.model_dump()})}\n\n"

            # Save to database
            db_recipe = RecipeModel(
                user_id=current_user.id,
                name=recipe_llm.name,
                description=recipe_llm.description,
                cuisine=recipe_llm.cuisine,
                difficulty=request.difficulty or "medium",
                instructions=recipe_llm.instructions,
                ingredients=[ing.model_dump() for ing in recipe_llm.ingredients],
                prep_time_minutes=recipe_llm.prep_time_minutes,
                cook_time_minutes=recipe_llm.cook_time_minutes,
                servings=recipe_llm.servings,
                tags=recipe_llm.tags,
                source="ai_generated",
                source_urls=recipe_llm.source_urls,
                calories=recipe_llm.nutrition.calories,
                protein_g=recipe_llm.nutrition.protein_g,
                carbs_g=recipe_llm.nutrition.carbs_g,
                fat_g=recipe_llm.nutrition.fat_g,
                fiber_g=recipe_llm.nutrition.fiber_g,
                sugar_g=recipe_llm.nutrition.sugar_g,
                sodium_mg=recipe_llm.nutrition.sodium_mg,
            )

            db.add(db_recipe)
            db.commit()
            db.refresh(db_recipe)

            yield f"data: {json.dumps({'type': 'complete', 'recipe_id': db_recipe.id, 'message': 'Recipe created successfully!'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
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
