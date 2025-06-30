import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta
import json
from app.db.database import get_db
from app.api.deps import get_current_active_user
from app.models import (
    User,
    MealPlan as MealPlanModel,
    MealPlanItem as MealPlanItemModel,
    Recipe as RecipeModel,
)
from app.schemas.meal_plan import (
    WeeklyScheduleRequest,
    WeeklyMealPlan,
    MealSlot,
    RecipeSuggestion,
    MealPlan,
    RecipeSelectionRequest,
)
from app.agents.meal_planning_agent import meal_planning_agent

# OPTIMIZATION: To use the vector database-powered agent instead:
# from app.agents.optimized_meal_planning_agent import OptimizedMealPlanningAgent
# meal_planning_agent = OptimizedMealPlanningAgent(settings.ANTHROPIC_API_KEY)
#
# This will:
# 1. Search existing recipes first (no API call)
# 2. Use historical user data for personalization
# 3. Only call Claude when necessary
# 4. Learn from user interactions
#
# Benefits:
# - 60-80% reduction in API calls after initial usage
# - Personalized recommendations based on user history
# - Faster response times for common requests
# - Cost savings on Claude API usage

logger = logging.getLogger(__name__)
# from app.services import grocery_service  # Will implement grocery integration later

router = APIRouter()


@router.post("/weekly-plan/", response_model=WeeklyMealPlan)
async def create_weekly_meal_plan(
    schedule_request: WeeklyScheduleRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a weekly meal plan with AI-generated recipe suggestions"""

    # Calculate end date (6 days after start)
    end_date = schedule_request.start_date + timedelta(days=6)

    # Create the meal plan in database
    db_meal_plan = MealPlanModel(
        user_id=current_user.id,
        name=f"Meal Plan - Week of {schedule_request.start_date.strftime('%B %d, %Y')}",
        start_date=schedule_request.start_date,
        end_date=end_date,
    )

    db.add(db_meal_plan)
    db.commit()
    db.refresh(db_meal_plan)

    # Convert meal types to strings for the agent
    meal_type_strings = [meal_type.value for meal_type in schedule_request.meal_types]

    # Generate all meal suggestions for the week in a single call to ensure uniqueness
    try:
        weekly_suggestions = await meal_planning_agent.generate_weekly_meal_plan(
            cooking_days=schedule_request.cooking_days,
            meal_types=meal_type_strings,
            start_date=schedule_request.start_date.strftime("%B %d, %Y"),
            servings=schedule_request.servings,
            difficulty=schedule_request.difficulty,
            preferred_cuisines=schedule_request.preferred_cuisines,
            dietary_restrictions=schedule_request.dietary_restrictions,
            must_include_ingredients=schedule_request.must_include_ingredients,
            must_avoid_ingredients=schedule_request.must_avoid_ingredients,
            search_online=True,
        )
    except Exception as e:
        logger.error(f"Error generating weekly meal plan: {e}")
        # If generation fails, fall back to individual generation
        weekly_suggestions = {}

    # Generate meal slots for the week
    meal_slots = []
    current_date = schedule_request.start_date

    for day_offset in range(7):
        current_date = schedule_request.start_date + timedelta(days=day_offset)
        weekday = current_date.strftime("%A").lower()

        # Check if user wants to cook on this day
        if weekday in [day.lower() for day in schedule_request.cooking_days]:
            # Generate meal slots for each requested meal type
            for meal_type in schedule_request.meal_types:
                meal_key = f"{weekday}_{meal_type.value}"

                try:
                    # Try to get suggestions from the weekly plan first
                    if meal_key in weekly_suggestions:
                        recipe_suggestions = weekly_suggestions[meal_key]
                    else:
                        # Fallback to individual generation if not found
                        logger.info(f"Fallback generation for {meal_key}")
                    recipe_suggestions = await meal_planning_agent.generate_meal_suggestions(
                        meal_type=meal_type.value,
                        date_str=current_date.strftime("%A, %B %d"),
                        servings=schedule_request.servings,
                        difficulty=schedule_request.difficulty,
                        preferred_cuisines=schedule_request.preferred_cuisines,
                        dietary_restrictions=schedule_request.dietary_restrictions,
                        must_include_ingredients=schedule_request.must_include_ingredients,
                        must_avoid_ingredients=schedule_request.must_avoid_ingredients,
                    )

                    # Convert to RecipeSuggestion objects
                    suggestions = []
                    for i, recipe in enumerate(recipe_suggestions):
                        try:
                            suggestion = RecipeSuggestion(**recipe)
                            suggestions.append(suggestion)
                        except Exception as e:
                            logger.error(
                                f"❌ Error creating RecipeSuggestion {i + 1}: {e}"
                            )
                            logger.debug(f"Problem recipe data: {recipe}")
                            # Skip this recipe and continue
                            continue

                    meal_slot = MealSlot(
                        date=current_date,
                        meal_type=meal_type,
                        recipe_suggestions=suggestions,
                        selected_recipe_index=None,
                        selected_recipe=None,
                    )

                    meal_slots.append(meal_slot)

                except Exception as e:
                    logger.error(
                        f"Error creating meal slot for {meal_type} on {current_date}: {e}"
                    )
                    # Continue with other meals even if one fails
                    continue

    return WeeklyMealPlan(
        id=db_meal_plan.id,
        user_id=current_user.id,
        name=db_meal_plan.name,
        start_date=db_meal_plan.start_date,
        end_date=db_meal_plan.end_date,
        meal_slots=meal_slots,
    )


@router.post("/weekly-plan/stream")
async def create_weekly_meal_plan_stream(
    schedule_request: WeeklyScheduleRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a weekly meal plan with AI-generated recipe suggestions using streaming"""

    def generate():
        try:
            # Send initial message
            yield f"data: {json.dumps({'type': 'status', 'message': 'Starting meal plan generation...'})}\n\n"

            # Calculate end date (6 days after start)
            end_date = schedule_request.start_date + timedelta(days=6)

            # Create the meal plan in database
            db_meal_plan = MealPlanModel(
                user_id=current_user.id,
                name=f"Meal Plan - Week of {schedule_request.start_date.strftime('%B %d, %Y')}",
                start_date=schedule_request.start_date,
                end_date=end_date,
            )

            db.add(db_meal_plan)
            db.commit()
            db.refresh(db_meal_plan)

            yield f"data: {json.dumps({'type': 'status', 'message': 'Planning diverse meals for your week...'})}\n\n"

            # Generate meal slots for the week
            meal_slots = []
            current_date = schedule_request.start_date
            meal_count = 0
            total_meals = len(schedule_request.cooking_days) * len(
                schedule_request.meal_types
            )

            suggested_recipe_names = []  # Track already suggested recipes
            accumulated_thinking = ""

            for day_offset in range(7):
                current_date = schedule_request.start_date + timedelta(days=day_offset)
                weekday = current_date.strftime("%A").lower()

                # Check if user wants to cook on this day
                if weekday in [day.lower() for day in schedule_request.cooking_days]:
                    # Generate meal slots for each requested meal type
                    for meal_type in schedule_request.meal_types:
                        meal_count += 1
                        meal_type_str = meal_type.value

                        yield f"data: {json.dumps({'type': 'status', 'message': f'Planning {meal_type_str} for {weekday.title()} ({meal_count}/{total_meals})...'})}\n\n"

                        try:
                            # Generate suggestions with streaming using the agent
                            meal_json_text = ""

                            # Add a small delay to prevent rate limiting (except for first meal)
                            if meal_count > 1:
                                import time

                                time.sleep(1)  # 1 second delay between requests

                            stream_gen = meal_planning_agent.generate_meal_suggestions_stream(
                                meal_type=meal_type_str,
                                date_str=current_date.strftime("%A, %B %d"),
                                servings=schedule_request.servings,
                                difficulty=schedule_request.difficulty,
                                preferred_cuisines=schedule_request.preferred_cuisines,
                                dietary_restrictions=schedule_request.dietary_restrictions,
                                must_include_ingredients=schedule_request.must_include_ingredients,
                                must_avoid_ingredients=schedule_request.must_avoid_ingredients,
                                already_suggested=suggested_recipe_names,
                                search_online=True,
                            )

                            # Process the stream from the agent
                            stream_started = False
                            try:
                                for result in stream_gen:
                                    stream_started = True
                                    if isinstance(
                                        result, str
                                    ) and not result.startswith("data: "):
                                        # This is the final JSON text
                                        meal_json_text = result
                                        break
                                    else:
                                        # This is a streaming chunk - forward it to the client
                                        yield result

                                        # Parse the chunk to accumulate thinking for final processing
                                        try:
                                            if result.startswith("data: "):
                                                chunk_json = json.loads(
                                                    result[6:].strip()
                                                )
                                                if chunk_json.get("type") == "thinking":
                                                    accumulated_thinking += (
                                                        chunk_json.get("chunk", "")
                                                    )
                                                elif chunk_json.get("type") == "error":
                                                    # If we get an error from the agent, log it and use fallback
                                                    logger.warning(
                                                        f"⚠️ Agent error for {meal_type_str} on {weekday.title()}: {chunk_json.get('message', 'Unknown error')}"
                                                    )
                                                    meal_json_text = (
                                                        ""  # Force fallback
                                                    )
                                                    break
                                        except (json.JSONDecodeError, ValueError):
                                            # If parsing fails, continue - the chunk will still be sent to client
                                            pass
                            except Exception as stream_error:
                                logger.error(
                                    f"❌ Stream processing error for {meal_type_str} on {weekday.title()}: {stream_error}"
                                )
                                stream_started = False

                            # If the stream never started or we got no content, force fallback
                            if not stream_started or not meal_json_text:
                                logger.warning(
                                    f"⚠️ Stream failed to start or returned no content for {meal_type_str} on {weekday.title()}"
                                )
                                meal_json_text = (
                                    ""  # This will trigger the fallback logic below
                                )

                            # Parse the final JSON result
                            try:
                                if not meal_json_text or not meal_json_text.strip():
                                    logger.warning(
                                        f"⚠️ Empty response for {meal_type_str} on {weekday.title()}, using fallback recipes"
                                    )
                                    yield f"data: {json.dumps({'type': 'status', 'message': f'Generating fallback recipes for {meal_type_str} on {weekday.title()}...'})}\n\n"

                                    # Generate fallback recipes
                                    fallback_recipes = []
                                    for i in range(3):
                                        fallback = (
                                            meal_planning_agent._get_fallback_recipe(
                                                meal_type_str, schedule_request.servings
                                            )
                                        )
                                        # Make each fallback unique by using the meal slot count to vary the selection
                                        fallback["name"] = (
                                            f"{fallback['name']} (Backup {meal_count}-{i + 1})"
                                        )
                                        fallback_recipes.append(fallback)

                                    # Save fallback recipes to database and continue
                                    saved_recipe_suggestions = []
                                    for recipe_data in fallback_recipes:
                                        try:
                                            # Create and save recipe to database
                                            db_recipe = RecipeModel(
                                                user_id=current_user.id,
                                                name=recipe_data["name"],
                                                description=recipe_data.get(
                                                    "description"
                                                ),
                                                instructions=recipe_data[
                                                    "instructions"
                                                ],
                                                ingredients=[
                                                    ing
                                                    for ing in recipe_data[
                                                        "ingredients"
                                                    ]
                                                ],
                                                prep_time_minutes=recipe_data.get(
                                                    "prep_time",
                                                    recipe_data.get(
                                                        "prep_time_minutes"
                                                    ),
                                                ),
                                                cook_time_minutes=recipe_data.get(
                                                    "cook_time",
                                                    recipe_data.get(
                                                        "cook_time_minutes"
                                                    ),
                                                ),
                                                servings=recipe_data["servings"],
                                                tags=recipe_data.get("tags", []),
                                                source="ai_generated_meal_plan_fallback",
                                                source_urls=recipe_data.get(
                                                    "source_urls", []
                                                ),
                                                # Nutrition
                                                calories=recipe_data.get(
                                                    "nutrition", {}
                                                ).get("calories"),
                                                protein_g=recipe_data.get(
                                                    "nutrition", {}
                                                ).get("protein_g"),
                                                carbs_g=recipe_data.get(
                                                    "nutrition", {}
                                                ).get("carbs_g"),
                                                fat_g=recipe_data.get(
                                                    "nutrition", {}
                                                ).get("fat_g"),
                                                fiber_g=recipe_data.get(
                                                    "nutrition", {}
                                                ).get("fiber_g"),
                                                sugar_g=recipe_data.get(
                                                    "nutrition", {}
                                                ).get("sugar_g"),
                                                sodium_mg=recipe_data.get(
                                                    "nutrition", {}
                                                ).get("sodium_mg"),
                                            )

                                            db.add(db_recipe)
                                            db.commit()
                                            db.refresh(db_recipe)

                                            # Add the saved recipe data with ID for the response
                                            recipe_with_id = recipe_data.copy()
                                            recipe_with_id["id"] = db_recipe.id
                                            recipe_with_id["prep_time"] = (
                                                recipe_data.get(
                                                    "prep_time",
                                                    recipe_data.get(
                                                        "prep_time_minutes", 0
                                                    ),
                                                )
                                            )
                                            recipe_with_id["cook_time"] = (
                                                recipe_data.get(
                                                    "cook_time",
                                                    recipe_data.get(
                                                        "cook_time_minutes", 0
                                                    ),
                                                )
                                            )
                                            recipe_with_id["prep_time_minutes"] = (
                                                recipe_with_id["prep_time"]
                                            )
                                            recipe_with_id["cook_time_minutes"] = (
                                                recipe_with_id["cook_time"]
                                            )
                                            saved_recipe_suggestions.append(
                                                recipe_with_id
                                            )

                                            # Track suggested recipe names to avoid duplicates
                                            if recipe_data.get("name"):
                                                suggested_recipe_names.append(
                                                    recipe_data["name"]
                                                )

                                        except Exception as e:
                                            logger.error(
                                                f"Error saving fallback recipe {recipe_data.get('name', 'Unknown')}: {e}"
                                            )
                                            # Still include the recipe in suggestions even if saving failed
                                            saved_recipe_suggestions.append(recipe_data)
                                            if recipe_data.get("name"):
                                                suggested_recipe_names.append(
                                                    recipe_data["name"]
                                                )

                                    # Convert to RecipeSuggestion objects for response
                                    from app.schemas.meal_plan import RecipeSuggestion

                                    suggestions = []
                                    for i, recipe in enumerate(
                                        saved_recipe_suggestions
                                    ):
                                        try:
                                            suggestion = RecipeSuggestion(**recipe)
                                            suggestions.append(suggestion)
                                        except Exception as e:
                                            logger.error(
                                                f"❌ Error creating fallback RecipeSuggestion {i + 1} for {meal_type_str}: {e}"
                                            )
                                            continue

                                    if suggestions:
                                        # Create meal plan item with recipe suggestions data
                                        from app.models.meal_plan import (
                                            MealPlanItem as MealPlanItemModel,
                                        )

                                        meal_plan_item = MealPlanItemModel(
                                            meal_plan_id=db_meal_plan.id,
                                            date=current_date,
                                            meal_type=meal_type.value,
                                            recipe_data={
                                                "recipe_suggestions": [
                                                    s.dict() for s in suggestions
                                                ],
                                                "selected_recipe_index": None,
                                            },
                                        )
                                        db.add(meal_plan_item)
                                        db.commit()

                                        meal_slot = {
                                            "date": current_date.isoformat(),
                                            "meal_type": meal_type.value,
                                            "recipe_suggestions": [
                                                s.dict() for s in suggestions
                                            ],
                                            "selected_recipe_index": None,
                                            "selected_recipe": None,
                                        }

                                        meal_slots.append(meal_slot)
                                        yield f"data: {json.dumps({'type': 'status', 'message': f'✅ Generated fallback recipes for {meal_type_str} on {weekday.title()}'})}\n\n"

                                    continue

                                # Extract JSON from after MEAL_SUGGESTIONS_COMPLETE marker if present
                                json_to_parse = meal_json_text
                                if "MEAL_SUGGESTIONS_COMPLETE" in meal_json_text:
                                    json_to_parse = meal_json_text.split(
                                        "MEAL_SUGGESTIONS_COMPLETE", 1
                                    )[1].strip()

                                # Add debugging info
                                logger.info(
                                    f"🔧 DEBUG: Parsing JSON for {meal_type_str} on {weekday.title()}"
                                )
                                logger.info(
                                    f"🔧 DEBUG: JSON text length: {len(json_to_parse)}"
                                )
                                logger.debug(
                                    f"🔧 DEBUG: First 300 chars: {json_to_parse[:300]}..."
                                )

                                # Parse and validate the recipes
                                recipe_suggestions = (
                                    meal_planning_agent._parse_recipe_suggestions(
                                        json_to_parse
                                    )
                                )

                                if (
                                    not isinstance(recipe_suggestions, list)
                                    or len(recipe_suggestions) == 0
                                ):
                                    error_msg = f"Invalid recipe format received for {meal_type_str} on {weekday.title()}"
                                    logger.error(
                                        f"❌ {error_msg} - Got {type(recipe_suggestions)} with {len(recipe_suggestions) if isinstance(recipe_suggestions, list) else 'unknown'} items"
                                    )
                                    logger.debug(f"Raw JSON text: {json_to_parse}")
                                    yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
                                    continue

                                logger.info(
                                    f"✅ Successfully parsed {len(recipe_suggestions)} recipes for {meal_type_str} on {weekday.title()}"
                                )

                                # Debug: Log the structure of the first recipe
                                if recipe_suggestions:
                                    first_recipe = recipe_suggestions[0]
                                    logger.info(
                                        f"🔧 DEBUG: First recipe structure - Keys: {list(first_recipe.keys())}"
                                    )
                                    logger.info(
                                        f"🔧 DEBUG: First recipe name: {first_recipe.get('name', 'NO NAME')}"
                                    )
                                    logger.info(
                                        f"🔧 DEBUG: Has ingredients: {bool(first_recipe.get('ingredients'))}, type: {type(first_recipe.get('ingredients'))}"
                                    )
                                    logger.info(
                                        f"🔧 DEBUG: Has instructions: {bool(first_recipe.get('instructions'))}, type: {type(first_recipe.get('instructions'))}"
                                    )

                                # Save the generated recipes to database
                                saved_recipe_suggestions = []
                                for recipe_data in recipe_suggestions:
                                    try:
                                        # Create and save recipe to database
                                        db_recipe = RecipeModel(
                                            user_id=current_user.id,
                                            name=recipe_data["name"],
                                            description=recipe_data.get("description"),
                                            instructions=recipe_data["instructions"],
                                            ingredients=[
                                                ing
                                                for ing in recipe_data["ingredients"]
                                            ],
                                            prep_time_minutes=recipe_data.get(
                                                "prep_time",
                                                recipe_data.get("prep_time_minutes"),
                                            ),
                                            cook_time_minutes=recipe_data.get(
                                                "cook_time",
                                                recipe_data.get("cook_time_minutes"),
                                            ),
                                            servings=recipe_data["servings"],
                                            tags=recipe_data.get("tags", []),
                                            source="ai_generated_meal_plan",
                                            source_urls=recipe_data.get(
                                                "source_urls", []
                                            ),
                                            # Nutrition
                                            calories=recipe_data.get(
                                                "nutrition", {}
                                            ).get("calories"),
                                            protein_g=recipe_data.get(
                                                "nutrition", {}
                                            ).get("protein_g"),
                                            carbs_g=recipe_data.get(
                                                "nutrition", {}
                                            ).get("carbs_g"),
                                            fat_g=recipe_data.get("nutrition", {}).get(
                                                "fat_g"
                                            ),
                                            fiber_g=recipe_data.get(
                                                "nutrition", {}
                                            ).get("fiber_g"),
                                            sugar_g=recipe_data.get(
                                                "nutrition", {}
                                            ).get("sugar_g"),
                                            sodium_mg=recipe_data.get(
                                                "nutrition", {}
                                            ).get("sodium_mg"),
                                        )

                                        db.add(db_recipe)
                                        db.commit()
                                        db.refresh(db_recipe)

                                        # Add the saved recipe data with ID for the response
                                        recipe_with_id = recipe_data.copy()
                                        recipe_with_id["id"] = db_recipe.id
                                        # Ensure consistent field names for frontend
                                        recipe_with_id["prep_time"] = recipe_data.get(
                                            "prep_time",
                                            recipe_data.get("prep_time_minutes", 0),
                                        )
                                        recipe_with_id["cook_time"] = recipe_data.get(
                                            "cook_time",
                                            recipe_data.get("cook_time_minutes", 0),
                                        )
                                        recipe_with_id["prep_time_minutes"] = (
                                            recipe_with_id["prep_time"]
                                        )
                                        recipe_with_id["cook_time_minutes"] = (
                                            recipe_with_id["cook_time"]
                                        )
                                        saved_recipe_suggestions.append(recipe_with_id)

                                        # Track suggested recipe names to avoid duplicates
                                        if recipe_data.get("name"):
                                            suggested_recipe_names.append(
                                                recipe_data["name"]
                                            )

                                    except Exception as e:
                                        logger.error(
                                            f"Error saving recipe {recipe_data.get('name', 'Unknown')}: {e}"
                                        )
                                        # Still include the recipe in suggestions even if saving failed
                                        saved_recipe_suggestions.append(recipe_data)
                                        if recipe_data.get("name"):
                                            suggested_recipe_names.append(
                                                recipe_data["name"]
                                            )

                                # Convert to RecipeSuggestion objects for response
                                from app.schemas.meal_plan import RecipeSuggestion

                                suggestions = []
                                for i, recipe in enumerate(saved_recipe_suggestions):
                                    try:
                                        suggestion = RecipeSuggestion(**recipe)
                                        suggestions.append(suggestion)
                                    except Exception as e:
                                        logger.error(
                                            f"❌ Error creating RecipeSuggestion {i + 1} for {meal_type_str}: {e}"
                                        )
                                        logger.debug(f"Problem recipe data: {recipe}")
                                        # Skip this recipe and continue
                                        continue

                                if suggestions:
                                    # Create meal plan item with recipe suggestions data
                                    from app.models.meal_plan import (
                                        MealPlanItem as MealPlanItemModel,
                                    )

                                    meal_plan_item = MealPlanItemModel(
                                        meal_plan_id=db_meal_plan.id,
                                        date=current_date,
                                        meal_type=meal_type.value,
                                        recipe_data={
                                            "recipe_suggestions": [
                                                s.dict() for s in suggestions
                                            ],
                                            "selected_recipe_index": None,
                                        },
                                    )
                                    db.add(meal_plan_item)
                                    db.commit()

                                    meal_slot = {
                                        "date": current_date.isoformat(),
                                        "meal_type": meal_type.value,
                                        "recipe_suggestions": [
                                            s.dict() for s in suggestions
                                        ],
                                        "selected_recipe_index": None,
                                        "selected_recipe": None,
                                    }

                                    meal_slots.append(meal_slot)
                                    yield f"data: {json.dumps({'type': 'status', 'message': f'✅ Generated and saved 3 recipes for {meal_type_str} on {weekday.title()}'})}\n\n"

                            except Exception as e:
                                yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to parse recipes for {meal_type_str} on {weekday.title()}: {str(e)}'})}\n\n"
                                continue

                        except Exception as e:
                            yield f"data: {json.dumps({'type': 'error', 'message': f'Error planning {meal_type_str} for {weekday.title()}: {str(e)}'})}\n\n"
                            continue

            # Create the final meal plan
            weekly_plan = {
                "id": db_meal_plan.id,
                "user_id": current_user.id,
                "name": db_meal_plan.name,
                "start_date": db_meal_plan.start_date.isoformat(),
                "end_date": db_meal_plan.end_date.isoformat(),
                "meal_slots": meal_slots,
            }

            # Send completion message with meal plan
            total_recipes_saved = sum(
                len(slot["recipe_suggestions"]) for slot in meal_slots
            )
            yield f"data: {json.dumps({'type': 'complete', 'meal_plan': weekly_plan, 'message': f'Weekly meal plan complete! 🎉 Saved {total_recipes_saved} recipes to your collection.', 'thinking_length': len(accumulated_thinking)})}\n\n"

        except Exception as e:
            import traceback

            error_details = traceback.format_exc()
            logger.error(f"Error in streaming meal plan generation: {e}")
            logger.error(f"Full traceback: {error_details}")
            yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to generate meal plan: {str(e)}'})}\n\n"

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


@router.post("/select-recipe/")
async def select_recipe_for_meal(
    selection: RecipeSelectionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Select a recipe from the suggestions for a specific meal slot"""

    # Verify meal plan belongs to user
    meal_plan = (
        db.query(MealPlanModel)
        .filter(
            MealPlanModel.id == selection.meal_plan_id,
            MealPlanModel.user_id == current_user.id,
        )
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found"
        )

    # Find the meal plan item
    meal_item = (
        db.query(MealPlanItemModel)
        .filter(
            MealPlanItemModel.meal_plan_id == selection.meal_plan_id,
            MealPlanItemModel.date == selection.meal_slot_date,
            MealPlanItemModel.meal_type == selection.meal_type.value,
        )
        .first()
    )

    if not meal_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal slot not found"
        )

    # Update the selected recipe index in the recipe_data
    if meal_item.recipe_data:
        meal_item.recipe_data["selected_recipe_index"] = selection.selected_recipe_index
    else:
        meal_item.recipe_data = {
            "selected_recipe_index": selection.selected_recipe_index
        }

    # Mark the field as modified so SQLAlchemy knows to update it
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(meal_item, "recipe_data")

    db.commit()

    return {"detail": "Recipe selection saved successfully"}


@router.get("/meal-plans/", response_model=List[MealPlan])
async def get_meal_plans(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's meal plans"""
    meal_plans = (
        db.query(MealPlanModel)
        .filter(MealPlanModel.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return meal_plans


@router.get("/meal-plans/{meal_plan_id}/", response_model=MealPlan)
async def get_meal_plan(
    meal_plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific meal plan"""
    meal_plan = (
        db.query(MealPlanModel)
        .filter(
            MealPlanModel.id == meal_plan_id, MealPlanModel.user_id == current_user.id
        )
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found"
        )

    return meal_plan


@router.get("/meal-plans/{meal_plan_id}/details", response_model=WeeklyMealPlan)
async def get_meal_plan_details(
    meal_plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get detailed meal plan with all meal slots and recipes"""
    meal_plan = (
        db.query(MealPlanModel)
        .filter(
            MealPlanModel.id == meal_plan_id, MealPlanModel.user_id == current_user.id
        )
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found"
        )

    # Get all meal plan items with recipe suggestions
    meal_items = (
        db.query(MealPlanItemModel)
        .filter(MealPlanItemModel.meal_plan_id == meal_plan_id)
        .order_by(MealPlanItemModel.date, MealPlanItemModel.meal_type)
        .all()
    )

    # Create meal slots from stored meal plan items
    meal_slots = []
    for item in meal_items:
        if not item.recipe_data or "recipe_suggestions" not in item.recipe_data:
            continue

        # Load recipe suggestions from stored JSON data
        recipe_suggestions_data = item.recipe_data.get("recipe_suggestions", [])
        selected_recipe_index = item.recipe_data.get("selected_recipe_index")

        # Convert to RecipeSuggestion objects
        suggestions = []
        for recipe_data in recipe_suggestions_data:
            try:
                suggestion = RecipeSuggestion(**recipe_data)
                suggestions.append(suggestion)
            except Exception as e:
                logger.error(f"Error parsing recipe suggestion: {e}")
                continue

        # Get selected recipe if any
        selected_recipe = None
        if selected_recipe_index is not None and 0 <= selected_recipe_index < len(
            suggestions
        ):
            selected_recipe = suggestions[selected_recipe_index]

        # Create meal slot
        meal_slot = MealSlot(
            date=item.date,
            meal_type=item.meal_type,
            recipe_suggestions=suggestions,
            selected_recipe_index=selected_recipe_index,
            selected_recipe=selected_recipe,
        )

        meal_slots.append(meal_slot)

    return WeeklyMealPlan(
        id=meal_plan.id,
        user_id=current_user.id,
        name=meal_plan.name,
        start_date=meal_plan.start_date,
        end_date=meal_plan.end_date,
        meal_slots=meal_slots,
    )


@router.post("/meal-plans/{meal_plan_id}/generate-grocery-list/")
async def generate_grocery_list_from_meal_plan(
    meal_plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generate a grocery list from selected recipes in a meal plan"""

    # Verify meal plan belongs to user
    meal_plan = (
        db.query(MealPlanModel)
        .filter(
            MealPlanModel.id == meal_plan_id, MealPlanModel.user_id == current_user.id
        )
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found"
        )

    # Get all meal plan items with selected recipes
    meal_items = (
        db.query(MealPlanItemModel)
        .filter(
            MealPlanItemModel.meal_plan_id == meal_plan_id,
            MealPlanItemModel.recipe_data.isnot(None),
        )
        .all()
    )

    if not meal_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recipes selected in this meal plan",
        )

    # For now, return a placeholder response
    # In a full implementation, you'd:
    # 1. Retrieve the original recipe suggestions
    # 2. Get the selected recipes based on stored indices
    # 3. Generate grocery list from those recipes

    return {
        "detail": f"Grocery list generation initiated for meal plan {meal_plan_id}",
        "meal_items_count": len(meal_items),
    }


@router.delete("/meal-plans/{meal_plan_id}/")
async def delete_meal_plan(
    meal_plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a meal plan"""
    meal_plan = (
        db.query(MealPlanModel)
        .filter(
            MealPlanModel.id == meal_plan_id, MealPlanModel.user_id == current_user.id
        )
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found"
        )

    db.delete(meal_plan)
    db.commit()

    return {"detail": "Meal plan deleted successfully"}


@router.post(
    "/meal-plans/{meal_plan_id}/select-recipe/{meal_slot_index}/{recipe_index}"
)
async def update_recipe_selection(
    meal_plan_id: int,
    meal_slot_index: int,
    recipe_index: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update the selected recipe for a meal slot by meal slot index"""

    # Verify meal plan belongs to user
    meal_plan = (
        db.query(MealPlanModel)
        .filter(
            MealPlanModel.id == meal_plan_id,
            MealPlanModel.user_id == current_user.id,
        )
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found"
        )

    # Get all meal plan items ordered by date and meal type
    meal_items = (
        db.query(MealPlanItemModel)
        .filter(MealPlanItemModel.meal_plan_id == meal_plan_id)
        .order_by(MealPlanItemModel.date, MealPlanItemModel.meal_type)
        .all()
    )

    # Find the meal item by index
    if meal_slot_index < 0 or meal_slot_index >= len(meal_items):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal slot index out of range"
        )

    meal_item = meal_items[meal_slot_index]

    # Update the selected recipe index in the recipe_data
    if meal_item.recipe_data:
        meal_item.recipe_data["selected_recipe_index"] = recipe_index
    else:
        meal_item.recipe_data = {"selected_recipe_index": recipe_index}

    # Mark the field as modified so SQLAlchemy knows to update it
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(meal_item, "recipe_data")

    db.commit()

    return {"detail": "Recipe selection saved successfully"}
