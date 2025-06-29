import anthropic
import json
import logging
from typing import List, Dict, Optional
from app.core.config import settings
from app.schemas.recipe import RecipeGenerationRequest, Ingredient, NutritionFacts
from app.models import User, RecipeFeedback
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class RecipeAgent:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def generate_recipe_stream(
        self, request: RecipeGenerationRequest, user: User, db: Session
    ):
        """Generate a recipe with streaming response from Claude, with optional web search"""

        # Get user's past feedback to personalize recommendations
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

        # Build the prompt
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(request, user, liked_recipes)

        # Debug: Print cuisine request
        logger.info(
            f"🍳 Streaming {request.cuisine or 'any'} cuisine recipe for {request.meal_type or 'meal'}"
        )

        # Set up tools for web search if enabled
        tools = None
        if hasattr(request, "search_online") and request.search_online:
            tools = [
                {
                    "type": "web_search_20250305",
                    "name": "web_search",
                    "max_uses": 3,
                    "allowed_domains": [
                        "allrecipes.com",
                        "foodnetwork.com",
                        "seriouseats.com",
                        "simplyrecipes.com",
                        "food.com",
                        "tasteofhome.com",
                        "delish.com",
                        "cookinglight.com",
                    ],
                }
            ]

            # Add search instruction to the prompt
            search_query = (
                f"{request.cuisine or ''} {request.meal_type or ''} recipe".strip()
            )
            user_prompt = f"""First, search the web for "{search_query}" to get inspiration from real recipes, then create an original recipe based on the user's requirements and the search results.

{user_prompt}"""

        try:
            # Create streaming response
            stream_args = {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 10000,
                "temperature": 1.0,  # Must be 1.0 when thinking is enabled
                "system": system_prompt,
                "thinking": {"type": "enabled", "budget_tokens": 5000},
                "messages": [{"role": "user", "content": user_prompt}],
            }
            if tools is not None:
                stream_args["tools"] = tools

            with self.client.messages.stream(**stream_args) as stream:
                accumulated_text = ""
                accumulated_thinking = ""
                current_content_type = None  # Track current content block type
                stop_streaming = False  # Flag to stop when we hit RECIPE_COMPLETE

                for chunk in stream:
                    if stop_streaming:
                        # Continue accumulating for JSON parsing but don't stream to user
                        if chunk.type == "content_block_delta" and hasattr(
                            chunk.delta, "text"
                        ):
                            accumulated_text += chunk.delta.text
                        continue

                    if chunk.type == "content_block_start":
                        # Check if this is a thinking block
                        if hasattr(chunk, "content_block") and hasattr(
                            chunk.content_block, "type"
                        ):
                            current_content_type = chunk.content_block.type
                            if chunk.content_block.type == "thinking":
                                yield f"data: {json.dumps({'type': 'thinking_start', 'message': 'Hungry Helper is thinking...'})}\n\n"

                    elif chunk.type == "content_block_delta":
                        if hasattr(chunk.delta, "text"):
                            text_chunk = chunk.delta.text
                            accumulated_text += text_chunk

                            # Check if we've hit the completion marker
                            if "RECIPE_COMPLETE" in accumulated_text:
                                # Send a completion status and stop streaming content to user
                                yield f"data: {json.dumps({'type': 'status', 'message': 'Recipe analysis complete! Finalizing and saving...'})}\n\n"
                                stop_streaming = True
                                continue

                            # Use the stored content type to determine stream type
                            if current_content_type == "thinking":
                                accumulated_thinking += text_chunk
                                yield f"data: {json.dumps({'type': 'thinking', 'chunk': text_chunk})}\n\n"
                            else:
                                # Stream content to user
                                yield f"data: {json.dumps({'type': 'content', 'chunk': text_chunk})}\n\n"

                    elif chunk.type == "content_block_stop":
                        # Signal end of a content block
                        if current_content_type == "thinking":
                            yield f"data: {json.dumps({'type': 'thinking_stop', 'message': 'Thinking complete'})}\n\n"
                        current_content_type = None  # Reset for next block

                # Extract JSON from after RECIPE_COMPLETE marker
                recipe_json_text = ""
                if "RECIPE_COMPLETE" in accumulated_text:
                    recipe_json_text = accumulated_text.split("RECIPE_COMPLETE", 1)[
                        1
                    ].strip()
                else:
                    recipe_json_text = accumulated_text

                # Log the final accumulated response for debugging
                logger.info(
                    f"📝 Complete recipe generated, content length: {len(accumulated_text)}, thinking length: {len(accumulated_thinking)}"
                )
                logger.debug(f"🔧 JSON text to parse: {recipe_json_text[:200]}...")

                # Validate the recipe format before returning
                if not self._validate_recipe_json(recipe_json_text):
                    error_msg = "Generated recipe failed validation checks"
                    logger.error(f"❌ {error_msg}")
                    return json.dumps({"error": error_msg})

                if not recipe_json_text.strip():
                    error_msg = "Empty recipe response received from AI"
                    logger.error(f"❌ {error_msg}")
                    return json.dumps({"error": error_msg})

                # Yield the extracted JSON text for processing by the endpoint
                yield recipe_json_text

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
    ) -> Dict:
        """Generate a recipe based on user preferences and request parameters (non-streaming version)"""

        # Get user's past feedback to personalize recommendations
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

        # Build the prompt
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(request, user, liked_recipes)

        # Debug: Print cuisine request
        logger.info(
            f"🍳 Generating {request.cuisine or 'any'} cuisine recipe for {request.meal_type or 'meal'}"
        )

        # Set up tools for web search if enabled
        tools = None
        if hasattr(request, "search_online") and request.search_online:
            tools = [
                {
                    "type": "web_search_20250305",
                    "name": "web_search",
                    "max_uses": 5,
                    "allowed_domains": [
                        "maangchi.com",
                        "omnivorescookbook.com",
                        "hot-thai-kitchen.com",
                        "budgetbytes.com",
                        "seriouseats.com",
                        "americastestkitchen.com",
                    ],
                }
            ]

            # Add search instruction to the prompt
            search_query = (
                f"{request.cuisine or ''} {request.meal_type or ''} recipe".strip()
            )
            user_prompt = f"""First, search the web for "{search_query}" to get inspiration from real recipes, then create an original recipe based on the user's requirements and the search results.

{user_prompt}"""
            logger.info(f"🔍 Web search enabled for query: {search_query}")

        try:
            request_args = {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 10000,
                "temperature": 1.0,  # Lower temperature for more focused responses
                "system": system_prompt,
                "thinking": {"type": "enabled", "budget_tokens": 5000},
                "messages": [{"role": "user", "content": user_prompt}],
            }
            if tools is not None:
                request_args["tools"] = tools

            response = self.client.messages.create(**request_args)

            # Extract text content from the response (skip thinking blocks)
            recipe_text = None
            for content_block in response.content:
                if hasattr(content_block, "text"):
                    recipe_text = content_block.text
                    break

            if not recipe_text:
                raise Exception("No text content found in Claude response")

            # Debug print to see what we got
            logger.debug(f"Recipe text received: {recipe_text[:200]}...")

            # Clean and extract JSON from the response
            recipe_data = self._extract_json_from_response(recipe_text)

            if not recipe_data:
                raise Exception("No valid JSON found in Claude response")

            result = self._format_recipe_response(recipe_data)

            # Add metadata about web search if it was used
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
        Generate detailed, delicious recipes based on user preferences.

        THINKING PROCESS:
        When thinking through your response, write in clear, complete sentences that flow naturally.
        Do not use markdown formatting, bullet points, or special characters in your thinking.
        Think aloud as if you're explaining your reasoning to a colleague in simple, conversational language.

        Before creating the recipe, think through:
        1. The user's specific requirements and constraints
        2. How to balance flavors, textures, and nutritional content
        3. The cooking techniques that would work best
        4. Timing and preparation logistics
        5. How to make the dish authentic to the specified cuisine
        6. Ways to incorporate user preferences and feedback

        Express your thinking in natural, flowing sentences like: "I'm considering what would work best for this cuisine type. The user wants something that takes less than 30 minutes, so I should focus on techniques that are quick but still authentic."

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
        liked_recipes: List[RecipeFeedback],
    ) -> str:
        prompt_parts = []

        # Start with cuisine preference if specified (make it prominent)
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
            # Basic request info
            if request.meal_type:
                prompt_parts.append(f"Create a {request.meal_type} recipe")
            else:
                prompt_parts.append("Create a recipe")

        # Add difficulty requirement if specified
        if request.difficulty:
            difficulty_instructions = {
                "easy": "Make this an EASY recipe with simple techniques, minimal prep work, and common ingredients. Perfect for beginners or busy weeknights.",
                "medium": "Make this a MEDIUM difficulty recipe with some cooking techniques and moderate prep time. Good for home cooks with some experience.",
                "hard": "Make this a HARD recipe with advanced techniques, longer preparation time, or specialized ingredients. For experienced cooks looking for a challenge.",
            }
            if request.difficulty.lower() in difficulty_instructions:
                prompt_parts.append(difficulty_instructions[request.difficulty.lower()])

        # Add instruction for natural thinking process
        prompt_parts.append(
            "\nThink through your recipe choice naturally, explaining your reasoning in conversational sentences as you would to a fellow chef. Then provide the JSON recipe after saying 'RECIPE_COMPLETE'."
        )

        # User preferences
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

        # Specific request parameters
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

        # Dietary restrictions
        all_restrictions = list(
            set(user.dietary_restrictions + request.dietary_restrictions)
        )
        if all_restrictions:
            prompt_parts.append(f"Dietary restrictions: {', '.join(all_restrictions)}")

        prompt_parts.append(f"Servings: {request.servings}")

        # Additional comments or special requests
        if request.comments and request.comments.strip():
            prompt_parts.append(
                f"Special requests or notes: {request.comments.strip()}"
            )

        # Past preferences with ratings
        if liked_recipes:
            # Group by rating level
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

            # Include any specific feedback notes
            feedback_with_notes = [f for f in liked_recipes if f.notes and f.recipe]
            if feedback_with_notes:
                prompt_parts.append("User feedback on past recipes:")
                for feedback in feedback_with_notes[:3]:
                    prompt_parts.append(f"- {feedback.recipe.name}: {feedback.notes}")

        return "\n".join(prompt_parts)

    def _format_recipe_response(self, recipe_data: Dict) -> Dict:
        """Format the AI response to match our schema"""
        return {
            "name": recipe_data.get("name"),
            "description": recipe_data.get("description"),
            "instructions": recipe_data.get("instructions", []),
            "ingredients": [
                Ingredient(**ing).dict() for ing in recipe_data.get("ingredients", [])
            ],
            "prep_time_minutes": recipe_data.get("prep_time_minutes"),
            "cook_time_minutes": recipe_data.get("cook_time_minutes"),
            "servings": recipe_data.get("servings", 4),
            "tags": recipe_data.get("tags", []),
            "nutrition": recipe_data.get("nutrition", {}),
            "source": "ai_generated",
            "source_urls": recipe_data.get("source_urls", []),
        }

    def estimate_nutrition(self, ingredients: List[Dict]) -> NutritionFacts:
        """Estimate nutrition facts for a recipe based on ingredients"""
        prompt = f"""Estimate the nutritional content per serving for a recipe with these ingredients:
        {json.dumps(ingredients)}

        Return JSON with: calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg"""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
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

        # Check for basic recipe indicators
        json_lower = json_text.lower()
        recipe_indicators = ["name", "ingredients", "instructions", "servings"]

        # Must contain at least 3 of the 4 key recipe fields
        found_indicators = sum(
            1 for indicator in recipe_indicators if indicator in json_lower
        )
        return found_indicators >= 3

    def _extract_json_from_response(self, response_text: str) -> Optional[Dict]:
        """Extract JSON from Claude's response, handling various formats"""
        if not response_text or not response_text.strip():
            logger.warning("Empty response text provided")
            return None

        try:
            # First, try to parse the entire response as JSON
            return json.loads(response_text.strip())
        except json.JSONDecodeError:
            pass

        # Remove markdown code blocks if present
        cleaned_text = response_text.strip()
        if "```json" in cleaned_text:
            start = cleaned_text.find("```json") + 7
            end = cleaned_text.find("```", start)
            if end != -1:
                try:
                    return json.loads(cleaned_text[start:end].strip())
                except json.JSONDecodeError:
                    pass

        if cleaned_text.startswith("```"):
            start = cleaned_text.find("\n") + 1
            end = cleaned_text.rfind("```")
            if start > 0 and end > start:
                try:
                    return json.loads(cleaned_text[start:end].strip())
                except json.JSONDecodeError:
                    pass

        # Look for text between curly braces - more comprehensive search
        import re

        # First try to find a complete JSON object spanning multiple lines
        brace_count = 0
        start_pos = -1

        for i, char in enumerate(cleaned_text):
            if char == "{":
                if brace_count == 0:
                    start_pos = i
                brace_count += 1
            elif char == "}":
                brace_count -= 1
                if brace_count == 0 and start_pos != -1:
                    # Found a complete JSON object
                    potential_json = cleaned_text[start_pos : i + 1]
                    try:
                        parsed = json.loads(potential_json)
                        # Validate it has required recipe fields
                        if (
                            isinstance(parsed, dict)
                            and "name" in parsed
                            and ("ingredients" in parsed or "instructions" in parsed)
                        ):
                            logger.info(
                                f"✅ Successfully extracted JSON from position {start_pos} to {i + 1}"
                            )
                            return parsed
                    except json.JSONDecodeError:
                        continue

        # If still no JSON found, try regex patterns
        json_pattern = r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}"
        json_matches = re.findall(json_pattern, cleaned_text, re.DOTALL)

        for match in json_matches:
            try:
                # Try to parse each potential JSON object
                parsed = json.loads(match)
                # Validate it has required recipe fields
                if (
                    isinstance(parsed, dict)
                    and "name" in parsed
                    and "ingredients" in parsed
                ):
                    logger.info("✅ Found valid recipe JSON via regex")
                    return parsed
            except json.JSONDecodeError:
                continue

        # Last resort: try to find JSON-like structure line by line
        lines = cleaned_text.split("\n")
        json_lines = []
        in_json = False

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("{"):
                in_json = True
                json_lines = [line]
            elif in_json:
                json_lines.append(line)
                if stripped.endswith("}"):
                    # Try to parse the accumulated JSON
                    try:
                        potential_json = "\n".join(json_lines)
                        parsed = json.loads(potential_json)
                        if isinstance(parsed, dict) and "name" in parsed:
                            logger.info(
                                "✅ Found valid recipe JSON via line-by-line parsing"
                            )
                            return parsed
                    except json.JSONDecodeError:
                        pass
                    in_json = False
                    json_lines = []

        logger.warning(
            f"⚠️ Could not extract valid JSON from response. Response length: {len(response_text)}"
        )
        logger.debug(f"Response preview: {response_text[:500]}...")
        return None
