import anthropic
import json
import logging
from app.schemas.recipe import RecipeGenerationRequest, Ingredient, NutritionFacts
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
        """Generate a recipe with streaming response from Claude, with optional web search"""
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
            f"🍳 Streaming {request.cuisine or 'any'} cuisine recipe for {request.meal_type or 'meal'}"
        )

        tools = None
        if hasattr(request, "search_online") and request.search_online:
            tools = self._build_web_search_tools(max_uses=3)

            search_query = (
                f"{request.cuisine or ''} {request.meal_type or ''} recipe".strip()
            )
            user_prompt = f"""First, search the web for "{search_query}" to get inspiration from real recipes, then create an original recipe based on the user's requirements and the search results.

{user_prompt}"""

        try:
            # Use inherited streaming method from UnifiedCulinaryAgent
            accumulated_text = ""
            for chunk in self._stream_claude_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=8000,
                temperature=1.0,
                thinking_budget=3000,
                tools=tools,
            ):
                # Handle special recipe streaming logic
                if "data:" in chunk and "type" in chunk:
                    # Update thinking message for recipe context
                    if "thinking_start" in chunk:
                        yield f"data: {json.dumps({'type': 'thinking_start', 'message': 'Hungry Helper is thinking...'})}\n\n"
                    else:
                        yield chunk
                elif "RECIPE_COMPLETE" in chunk:
                    yield f"data: {json.dumps({'type': 'status', 'message': 'Recipe analysis complete! Finalizing and saving...'})}\n\n"

                    # Extract JSON after marker
                    recipe_json_text = chunk.split("RECIPE_COMPLETE", 1)[1].strip()

                    if not self._validate_recipe_json(recipe_json_text):
                        error_msg = "Generated recipe failed validation checks"
                        logger.error(f"❌ {error_msg}")
                        yield json.dumps({"error": error_msg})
                        return

                    if not recipe_json_text.strip():
                        error_msg = "Empty recipe response received from AI"
                        logger.error(f"❌ {error_msg}")
                        yield json.dumps({"error": error_msg})
                        return

                    logger.info("📝 Complete recipe generated")
                    yield recipe_json_text
                    return
                else:
                    # Accumulate text for final parsing
                    accumulated_text += chunk

            # If we didn't find the completion marker, validate and return the full text
            if accumulated_text and "RECIPE_COMPLETE" not in accumulated_text:
                if not self._validate_recipe_json(accumulated_text):
                    error_msg = "Generated recipe failed validation checks"
                    logger.error(f"❌ {error_msg}")
                    yield json.dumps({"error": error_msg})
                    return

                logger.info("📝 Complete recipe generated (no marker found)")
                yield accumulated_text

        except anthropic.APIError as e:
            error_msg = f"Claude API error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

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
            f"🍳 Generating {request.cuisine or 'any'} cuisine recipe for {request.meal_type or 'meal'}"
        )

        tools = None
        if hasattr(request, "search_online") and request.search_online:
            tools = self._build_web_search_tools(max_uses=5)

            search_query = (
                f"{request.cuisine or ''} {request.meal_type or ''} recipe".strip()
            )
            user_prompt = f"""First, search the web for "{search_query}" to get inspiration from real recipes, then create an original recipe based on the user's requirements and the search results.

{user_prompt}"""
            logger.info(f"🔍 Web search enabled for query: {search_query}")

        try:
            request_args: dict[str, str | int | float | dict | list] = {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 10000,
                "temperature": 1.0,
                "system": system_prompt,
                "thinking": {"type": "enabled", "budget_tokens": 5000},
                "messages": [{"role": "user", "content": user_prompt}],
            }
            if tools is not None:
                request_args["tools"] = tools

            response = self.client.messages.create(**request_args)

            recipe_text: str | None = None
            for content_block in response.content:
                if hasattr(content_block, "text"):
                    recipe_text = content_block.text
                    break

            if not recipe_text:
                raise Exception("No text content found in Claude response")

            logger.debug(f"Recipe text received: {recipe_text[:200]}...")

            recipe_data = self._parse_recipe_json(recipe_text)

            if not recipe_data:
                raise Exception("No valid JSON found in Claude response")

            result = self._format_recipe_response(recipe_data)

            if tools:
                result["web_search_enabled"] = True

            return result

        except anthropic.APIError as e:
            logger.error(f"Anthropic API error: {e}")
            raise Exception(f"Claude API error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise

    def _build_system_prompt(self) -> str:
        return """You are a professional chef and nutritionist AI assistant.
        Generate detailed, delicious recipes based on user preferences and requirements.

        THINKING PROCESS:
        When thinking through your response, write in clear, complete sentences that flow naturally.
        Do not use markdown formatting, bullet points, or special characters in your thinking.
        Think aloud as if you're explaining your reasoning to a colleague in simple, conversational language.

        IMPORTANT: Pay special attention to any user preferences provided and discuss how you're incorporating them.

        Before creating the recipe, think through:
        1. The user's specific requirements, dietary restrictions, and personal preferences
        2. How their food preferences (favorite ingredients, cuisines, spice levels) influence your choice
        3. Any nutritional goals or restrictions they have (calories, protein targets, sodium limits)
        4. Their cooking constraints (time limits, skill level, available equipment)
        5. How to balance flavors, textures, and nutritional content within their preferences
        6. The cooking techniques that would work best for their skill level and time constraints
        7. How to make the dish authentic to the specified cuisine while respecting their preferences
        8. Ways to incorporate their liked ingredients and avoid disliked ones

        Express your thinking in natural, flowing sentences like: "Looking at the user's preferences, I see they love garlic and prefer medium spice levels, so I'll incorporate roasted garlic and use moderate amounts of chili. Since they want to keep sodium under 400mg per serving, I'll use herbs and citrus for flavor instead of salt."

        PERSONALIZATION REQUIREMENTS:
        - ALWAYS acknowledge and discuss user preferences when provided
        - Explain how you're incorporating their dietary restrictions and nutritional goals
        - Mention why you're choosing specific ingredients based on their preferences
        - Address any cooking time or skill level constraints they have
        - Show how you're avoiding ingredients they dislike or must avoid
        - Explain how the recipe meets their nutritional targets

        CRITICAL INSTRUCTIONS:
        - If the user specifies a cuisine type, you MUST create a recipe from that cuisine ONLY
        - Do NOT mix cuisines or create fusion dishes unless explicitly requested
        - The recipe name, ingredients, and cooking techniques must be authentic to the specified cuisine
        - If asked for "Italian" - create Italian dishes like pasta, risotto, osso buco, etc.
        - If asked for "Thai" - create Thai dishes like pad thai, green curry, etc.
        - NEVER ignore the cuisine requirement
        - If you search the web for recipe inspiration, use the results to inform your creation but create an original recipe
        - Combine the best elements from multiple sources when available
        - Always prioritize the user's specific requirements over found recipes

        WEB SEARCH INSTRUCTIONS:
        - If instructed to search the web, look for recipes that match the user's cuisine and meal type requirements
        - Use search results as inspiration, not direct copying
        - Combine techniques and ingredients from multiple sources
        - Ensure the final recipe is original and tailored to user preferences
        - If you find inspiration from multiple recipes during your search, include ALL their URLs in the source_urls array
        - Give proper credit to all sources that influenced your recipe creation

        OUTPUT FORMAT:
        First, provide your thinking process in natural language explaining your recipe choice and approach.
        When you are ready to provide the final recipe, simply say "RECIPE_COMPLETE" and then provide the recipe as a valid JSON object with this exact structure:

        {
            "name": "Recipe Name",
            "description": "Brief description",
            "ingredients": [
                {"name": "ingredient", "quantity": 1.5, "unit": "cups", "notes": "optional notes"}
            ],
            "instructions": ["Step 1", "Step 2", ...],
            "prep_time_minutes": 15,
            "cook_time_minutes": 30,
            "servings": 4,
            "tags": ["tag1", "tag2"],
            "nutrition": {
                "calories": 350,
                "protein_g": 25,
                "carbs_g": 40,
                "fat_g": 12,
                "fiber_g": 8,
                "sugar_g": 6,
                "sodium_mg": 450
            },
            "source_urls": ["https://example.com/inspiring-recipe-1", "https://example.com/inspiring-recipe-2"]
        }

        Provide accurate nutritional estimates per serving."""

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
        """Estimate nutrition facts for a recipe based on ingredients"""
        prompt = f"""Estimate the nutritional content per serving for a recipe with these ingredients:
        {json.dumps(ingredients)}

        Return JSON with: calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg"""

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            temperature=0.3,
            system="You are a nutritionist. Provide accurate nutritional estimates. Always respond with valid JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )

        nutrition_data = json.loads(response.content[0].text)
        return NutritionFacts(**nutrition_data)

    def _validate_recipe_json(self, json_text: str) -> bool:
        """Basic validation to check if JSON text contains recipe-like content"""
        if not json_text or not json_text.strip():
            return False

        json_lower = json_text.lower()
        recipe_indicators = ["name", "ingredients", "instructions", "servings"]

        if not all(f'"{indicator}"' in json_lower for indicator in recipe_indicators):
            logger.warning(
                f"Validation failed: One or more indicators not found in JSON text. Indicators: {recipe_indicators}"
            )
            return False

        try:
            data = json.loads(json_text)
            if not isinstance(data, dict):
                return False
            if not all(key in data for key in ["name", "ingredients", "instructions"]):
                return False
        except json.JSONDecodeError:
            return False

        return True

    def _parse_recipe_json(self, response_text: str) -> dict | None:
        """Parse recipe JSON from Claude response"""
        try:
            json_text = self._extract_json_from_text(response_text)
            if json_text:
                data = json.loads(json_text)
                if isinstance(data, dict):
                    # Fix and validate the recipe
                    fixed_recipe = self._fix_recipe(data)
                    if fixed_recipe and self._validate_recipe(fixed_recipe):
                        return fixed_recipe
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode recipe JSON: {e}")
            logger.debug(f"Response text that failed parsing: {response_text}")
            return None
