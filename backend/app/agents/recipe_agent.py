import json
import logging
from app.schemas.recipe import RecipeGenerationRequest, Ingredient, NutritionFacts
from app.schemas.llm_response import RecipeLLM, NutritionLLM
from app.models import User, RecipeFeedback
from app.agents.unified_culinary_agent import UnifiedCulinaryAgent
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class RecipeAgent(UnifiedCulinaryAgent):
    def __init__(self):
        super().__init__()

    def generate_recipe_stream(
        self, request: RecipeGenerationRequest, user: User, db: Session
    ):
        """Generate a recipe with streaming response from Together API"""
        liked_recipes = (
            db.query(RecipeFeedback)
            .filter(
                RecipeFeedback.user_id == user.id,
                ((RecipeFeedback.liked) | (RecipeFeedback.rating >= 4)),
            )
            .order_by(RecipeFeedback.rating.desc())
            .limit(10)
            .all()
        )

        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(request, user, liked_recipes)

        # Always extract and add user preferences for enhanced personalization
        user_preferences = self._extract_user_preferences(user)
        if user_preferences:  # Only add if there are any preferences
            user_prompt += self._build_enhanced_preferences_prompt(user_preferences)

        logger.info(
            f"🍳 Streaming {request.cuisine or 'any'} cuisine recipe with Llama 4 Maverick for {request.meal_type or 'meal'}"
        )

        try:
            # Show status while generating (can't show actual thinking with structured output)
            yield f"data: {json.dumps({'type': 'status', 'message': 'Hungry Helper is creating your recipe...'})}\n\n"

            accumulated_json = ""

            # Phase 1: Accumulate JSON from structured output
            for chunk in self._stream_together_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_schema=RecipeLLM,
                max_tokens=8000,
                temperature=1.0,
            ):
                # With structured output, we just get JSON chunks (no thinking events)
                accumulated_json += chunk

            # Phase 2: Parse JSON (guaranteed valid by structured output)
            if accumulated_json:
                logger.info(f"Parsing accumulated JSON ({len(accumulated_json)} chars)")
                recipe_data = json.loads(accumulated_json)
                recipe_llm = RecipeLLM(**recipe_data)

                # Phase 3: Stream formatted events for progressive reveal
                yield f"data: {json.dumps({'type': 'recipe_start'})}\n\n"

                yield f"data: {json.dumps({'type': 'recipe_name', 'content': recipe_llm.name})}\n\n"

                yield f"data: {json.dumps({'type': 'recipe_description', 'content': recipe_llm.description})}\n\n"

                yield f"data: {
                    json.dumps(
                        {
                            'type': 'recipe_metadata',
                            'content': {
                                'prep_time': recipe_llm.prep_time_minutes,
                                'cook_time': recipe_llm.cook_time_minutes,
                                'servings': recipe_llm.servings,
                                'tags': recipe_llm.tags,
                            },
                        }
                    )
                }\n\n"

                yield f"data: {json.dumps({'type': 'ingredients_start'})}\n\n"
                for ingredient in recipe_llm.ingredients:
                    yield f"data: {
                        json.dumps(
                            {
                                'type': 'ingredient',
                                'content': {
                                    'name': ingredient.name,
                                    'quantity': ingredient.quantity,
                                    'unit': ingredient.unit,
                                    'notes': ingredient.notes,
                                },
                            }
                        )
                    }\n\n"

                yield f"data: {json.dumps({'type': 'instructions_start'})}\n\n"
                for idx, instruction in enumerate(recipe_llm.instructions, 1):
                    yield f"data: {json.dumps({'type': 'instruction', 'step': idx, 'content': instruction})}\n\n"

                yield f"data: {json.dumps({'type': 'nutrition', 'content': recipe_llm.nutrition.model_dump()})}\n\n"

                # Save to database
                recipe = self._save_recipe_from_llm(recipe_llm, user, db)

                yield f"data: {json.dumps({'type': 'complete', 'recipe_id': recipe.id})}\n\n"

        except Exception as e:
            logger.error(f"Recipe streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    def generate_recipe(
        self, request: RecipeGenerationRequest, user: User, db: Session
    ) -> dict[str, str | list | int | dict]:
        """Generate a recipe based on user preferences and request parameters (non-streaming version)"""

        liked_recipes = (
            db.query(RecipeFeedback)
            .filter(
                RecipeFeedback.user_id == user.id,
                ((RecipeFeedback.liked) | (RecipeFeedback.rating >= 4)),
            )
            .order_by(RecipeFeedback.rating.desc())
            .limit(10)
            .all()
        )

        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(request, user, liked_recipes)

        # Always extract and add user preferences for enhanced personalization
        user_preferences = self._extract_user_preferences(user)
        if user_preferences:  # Only add if there are any preferences
            user_prompt += self._build_enhanced_preferences_prompt(user_preferences)

        logger.info(
            f"🍳 Generating {request.cuisine or 'any'} cuisine recipe with Llama 4 Maverick for {request.meal_type or 'meal'}"
        )

        try:
            # Non-streaming Together API call with structured output
            from app.core.config import settings

            response = self.client.chat.completions.create(
                model=settings.TOGETHER_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt + "\n\nRespond with valid JSON only.",
                    },
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=10000,
                temperature=1.0,
                response_format={
                    "type": "json_schema",
                    "schema": RecipeLLM.model_json_schema(),
                },
            )

            recipe_text = response.choices[0].message.content

            if not recipe_text:
                raise Exception("No content in Together response")

            # Parse the guaranteed-valid JSON
            recipe_data = json.loads(recipe_text)
            recipe_llm = RecipeLLM(**recipe_data)

            # Convert to response format
            result = self._format_recipe_response(recipe_llm.model_dump())

            return result

        except Exception as e:
            logger.error(f"Together API error: {e}")
            raise Exception(f"Together API error: {str(e)}")

    def _build_system_prompt(self) -> str:
        return """You are a professional chef and nutritionist. Generate detailed, delicious recipes.

CUISINE AUTHENTICITY:
- If a cuisine is specified, create ONLY dishes from that cuisine
- Use authentic ingredients, techniques, and flavor profiles for that cuisine
- Do NOT create fusion dishes unless explicitly requested

PERSONALIZATION:
- Incorporate user's dietary restrictions and preferences
- Use their favorite ingredients when possible
- Respect nutritional goals (calorie targets, protein needs, sodium limits)
- Match their cooking time constraints and skill level
- Avoid ingredients they dislike or cannot eat

QUALITY:
- Write clear, detailed, step-by-step instructions
- Provide accurate nutritional estimates per serving
- Include helpful cooking tips in ingredient notes when relevant
- Choose recipes appropriate for the requested difficulty level"""

    def _build_user_prompt(
        self,
        request: RecipeGenerationRequest,
        user: User,
        liked_recipes: list[RecipeFeedback],
    ) -> str:
        prompt_parts = []

        if request.cuisine:
            if request.meal_type:
                prompt_parts.append(
                    f"Create a {request.cuisine} {request.meal_type} recipe"
                )
            else:
                prompt_parts.append(f"Create a {request.cuisine} recipe")
            prompt_parts.append(
                f"IMPORTANT: This MUST be a {request.cuisine} dish with authentic {request.cuisine} flavors and ingredients."
            )
        else:
            if request.meal_type:
                prompt_parts.append(f"Create a {request.meal_type} recipe")
            else:
                prompt_parts.append("Create a recipe")

        if request.difficulty:
            difficulty_instructions = {
                "easy": "Make this an EASY recipe with simple techniques, minimal prep work, and common ingredients. Perfect for beginners or busy weeknights.",
                "medium": "Make this a MEDIUM difficulty recipe with some cooking techniques and moderate prep time. Good for home cooks with some experience.",
                "hard": "Make this a HARD recipe with advanced techniques, longer preparation time, or specialized ingredients. For experienced cooks looking for a challenge.",
            }
            if request.difficulty.lower() in difficulty_instructions:
                prompt_parts.append(difficulty_instructions[request.difficulty.lower()])

        prompt_parts.append(
            "\nThink through your recipe choice naturally, explaining your reasoning in conversational sentences as you would to a fellow chef. Then provide the JSON recipe after saying 'RECIPE_COMPLETE'."
        )

        if user.food_preferences:
            prefs = user.food_preferences
            if prefs.get("cuisines"):
                prompt_parts.append(
                    f"User's preferred cuisines: {', '.join(prefs['cuisines'])}"
                )
            if prefs.get("favorite_ingredients"):
                prompt_parts.append(
                    f"User's favorite ingredients: {', '.join(prefs['favorite_ingredients'])}"
                )

        if request.max_time_minutes:
            prompt_parts.append(
                f"Maximum total time: {request.max_time_minutes} minutes"
            )
        if request.ingredients_to_use:
            prompt_parts.append(
                f"Must include these ingredients: {', '.join(request.ingredients_to_use)}"
            )
        if request.ingredients_to_avoid:
            prompt_parts.append(
                f"Must avoid these ingredients: {', '.join(request.ingredients_to_avoid)}"
            )

        all_restrictions = list(
            set(user.dietary_restrictions + request.dietary_restrictions)
        )
        if all_restrictions:
            prompt_parts.append(f"Dietary restrictions: {', '.join(all_restrictions)}")

        prompt_parts.append(f"Servings: {request.servings}")

        if request.comments and request.comments.strip():
            prompt_parts.append(
                f"Special requests or notes: {request.comments.strip()}"
            )

        if liked_recipes:
            highly_rated = []
            liked_only = []

            for feedback in liked_recipes:
                if feedback.recipe:
                    recipe_info = feedback.recipe.name
                    if feedback.rating and feedback.rating >= 4:
                        highly_rated.append(f"{recipe_info} ({feedback.rating}★)")
                    elif feedback.liked:
                        liked_only.append(recipe_info)

            if highly_rated:
                prompt_parts.append(
                    f"User LOVED these recipes (highly rated): {', '.join(highly_rated[:5])}"
                )
            if liked_only:
                prompt_parts.append(
                    f"User liked these recipes: {', '.join(liked_only[:5])}"
                )

            feedback_with_notes = [f for f in liked_recipes if f.notes and f.recipe]
            if feedback_with_notes:
                prompt_parts.append("User feedback on past recipes:")
                for feedback in feedback_with_notes[:3]:
                    prompt_parts.append(f"- {feedback.recipe.name}: {feedback.notes}")

        return "\n".join(prompt_parts)

    def _extract_user_preferences(self, user: User) -> dict:
        """Extract comprehensive user preferences from User model"""
        preferences = {}

        # Basic user preferences
        if hasattr(user, "food_preferences") and user.food_preferences:
            preferences["food_preferences"] = user.food_preferences

        if hasattr(user, "dietary_restrictions") and user.dietary_restrictions:
            preferences["dietary_restrictions"] = user.dietary_restrictions

        if hasattr(user, "ingredient_rules") and user.ingredient_rules:
            preferences["ingredient_rules"] = user.ingredient_rules

        if hasattr(user, "food_type_rules") and user.food_type_rules:
            preferences["food_type_rules"] = user.food_type_rules

        if hasattr(user, "nutritional_rules") and user.nutritional_rules:
            preferences["nutritional_rules"] = user.nutritional_rules

        if hasattr(user, "scheduling_rules") and user.scheduling_rules:
            preferences["scheduling_rules"] = user.scheduling_rules

        if hasattr(user, "dietary_rules") and user.dietary_rules:
            preferences["dietary_rules"] = user.dietary_rules

        return preferences

    def _format_recipe_response(self, recipe_data: dict) -> dict:
        """Format the AI response to match our schema"""
        return {
            "name": recipe_data.get("name"),
            "description": recipe_data.get("description"),
            "instructions": recipe_data.get("instructions", []),
            "ingredients": [
                Ingredient(**ing).model_dump()
                for ing in recipe_data.get("ingredients", [])
            ],
            "prep_time_minutes": recipe_data.get("prep_time_minutes"),
            "cook_time_minutes": recipe_data.get("cook_time_minutes"),
            "servings": recipe_data.get("servings", 4),
            "tags": recipe_data.get("tags", []),
            "nutrition": recipe_data.get("nutrition", {}),
            "source": "ai_generated",
            "source_urls": recipe_data.get("source_urls", []),
        }

    def estimate_nutrition(self, ingredients: list[dict]) -> NutritionFacts:
        """Estimate nutrition using Together API with structured output"""
        from app.core.config import settings

        prompt = f"""Estimate the nutritional content per serving for a recipe with these ingredients:
        {json.dumps(ingredients)}

        Provide nutritional information as JSON."""

        response = self.client.chat.completions.create(
            model=settings.TOGETHER_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a nutritionist. Provide accurate nutritional estimates. Respond with JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
            temperature=0.3,
            response_format={
                "type": "json_schema",
                "schema": NutritionLLM.model_json_schema(),
            },
        )

        content = response.choices[0].message.content
        nutrition_data = json.loads(content)
        nutrition_llm = NutritionLLM(**nutrition_data)
        return NutritionFacts(**nutrition_llm.model_dump())

    def _save_recipe_from_llm(self, recipe_llm: RecipeLLM, user: User, db: Session):
        """Convert LLM recipe format to database model and save"""
        from app.models import Recipe as RecipeModel

        db_recipe = RecipeModel(
            user_id=user.id,
            name=recipe_llm.name,
            description=recipe_llm.description,
            instructions=recipe_llm.instructions,
            ingredients=[ing.model_dump() for ing in recipe_llm.ingredients],
            prep_time_minutes=recipe_llm.prep_time_minutes,
            cook_time_minutes=recipe_llm.cook_time_minutes,
            servings=recipe_llm.servings,
            tags=recipe_llm.tags,
            source="ai_generated",
            source_urls=recipe_llm.source_urls,
            # Nutrition
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

        return db_recipe
