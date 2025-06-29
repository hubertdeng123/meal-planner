import json
import random
from typing import List, Dict, Optional, Any, Iterator
from anthropic import Anthropic
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class MealPlanningAgent:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        """Lazy initialization of Anthropic client"""
        if self._client is None:
            self._client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._client

    def generate_meal_suggestions_stream(
        self,
        meal_type: str,
        date_str: str,
        servings: int = 4,
        difficulty: Optional[str] = None,
        preferred_cuisines: Optional[List[str]] = None,
        dietary_restrictions: Optional[List[str]] = None,
        must_include_ingredients: Optional[List[str]] = None,
        must_avoid_ingredients: Optional[List[str]] = None,
        already_suggested: Optional[List[str]] = None,
        search_online: bool = True,
    ) -> Iterator[str]:
        """Generate 3 diverse recipe suggestions for a specific meal with streaming response"""

        system_prompt = """You are an expert meal planning AI chef. Your PRIMARY GOAL is to generate EXACTLY 3 COMPLETELY DIFFERENT recipes.

CRITICAL DIVERSITY REQUIREMENTS:
1. Each recipe MUST use a DIFFERENT cuisine type (e.g., Italian, Mexican, Thai, Indian, Mediterranean, Japanese)
2. Each recipe MUST use DIFFERENT primary ingredients and proteins
3. Each recipe MUST use DIFFERENT cooking methods (e.g., grilling, baking, stovetop, slow cooking, stir-frying)
4. Recipe names MUST be completely unique and descriptive
5. NO recipe should be similar to any previously suggested recipes

DIFFICULTY LEVELS:
- Easy: Simple techniques, minimal prep, common ingredients, 15-30 minutes total time
- Medium: Some cooking skills required, moderate prep time, 30-60 minutes total time
- Hard: Advanced techniques, longer prep, specialized ingredients, 60+ minutes total time

EXAMPLE of GOOD diversity for dinner:
- Recipe 1: "Thai Green Curry with Chicken" (Thai, coconut base, stovetop, Medium)
- Recipe 2: "Mediterranean Baked Salmon with Herbs" (Mediterranean, fish, oven, Easy)
- Recipe 3: "Mexican Black Bean and Sweet Potato Tacos" (Mexican, vegetarian, assembly, Easy)

WEB SEARCH INSTRUCTIONS:
- If instructed to search the web, look for diverse recipes from different cuisines
- Use search results as inspiration for creating 3 unique, original recipes
- Ensure final recipes match the requested difficulty level
- If you find inspiration from multiple sources, include ALL their URLs in the source_urls array

THINKING PROCESS:
Think through your meal planning approach naturally. Consider the user's requirements, how to ensure recipe diversity, appropriate difficulty levels, and cuisine variety.

OUTPUT FORMAT:
First, provide your thinking process naturally about meal planning approach and recipe diversity.
When ready to provide suggestions, say "MEAL_SUGGESTIONS_COMPLETE" and then provide exactly 3 recipes as a JSON array with this exact structure:

[
  {
    "name": "Recipe Name",
    "description": "Brief 1-2 sentence description",
    "cuisine": "Specific cuisine type",
    "ingredients": [{"name": "ingredient", "quantity": 1.5, "unit": "cups"}],
    "instructions": ["Step 1", "Step 2", ...],
    "prep_time": 15,
    "cook_time": 30,
    "servings": 4,
    "difficulty": "Easy/Medium/Hard",
    "nutrition": {"calories": 350},
    "source_urls": ["https://example.com/recipe1", "https://example.com/recipe2"]
  }
]

IMPORTANT: Always consider dietary restrictions and preferences. Make recipes diverse but appropriate for the meal type and difficulty level."""

        # Build user prompt with difficulty considerations
        user_prompt = f"Generate 3 COMPLETELY DIFFERENT {meal_type} recipes for {date_str}. Each recipe must use a different cuisine, different main ingredients, and different cooking methods."

        # Add difficulty requirement if specified
        if difficulty:
            difficulty_instructions = {
                "easy": "All recipes should be EASY level - simple techniques, minimal prep work, common ingredients, and take no more than 30 minutes total time.",
                "medium": "All recipes should be MEDIUM difficulty - requiring some cooking skills, moderate prep time, and taking 30-60 minutes total time.",
                "hard": "All recipes should be HARD difficulty - using advanced techniques, longer preparation time, specialized ingredients, and taking 60+ minutes total time.",
            }
            if difficulty.lower() in difficulty_instructions:
                user_prompt += f"\n{difficulty_instructions[difficulty.lower()]}"

        if servings != 4:
            user_prompt += f" Serving {servings} people."

        if preferred_cuisines:
            user_prompt += (
                f"\nPreferred cuisines to choose from: {', '.join(preferred_cuisines)}"
            )

        if dietary_restrictions:
            user_prompt += f"\nDietary restrictions: {', '.join(dietary_restrictions)}"

        if must_include_ingredients:
            user_prompt += f"\nMust include these ingredients: {', '.join(must_include_ingredients)}"

        if must_avoid_ingredients:
            user_prompt += (
                f"\nAvoid these ingredients: {', '.join(must_avoid_ingredients)}"
            )

        # Add context about already suggested recipes with stronger language
        if already_suggested and len(already_suggested) > 0:
            user_prompt += f"\n\nCRITICAL: These recipes have ALREADY been suggested this week - DO NOT suggest anything similar: {', '.join(already_suggested)}"
            user_prompt += "\nYou MUST create completely different recipes with different cuisines, ingredients, cooking methods, and names."
            user_prompt += f"\nTotal recipes to avoid: {len(already_suggested)}"

        # Add instruction for natural thinking process
        user_prompt += "\n\nThink through your recipe choices naturally, explaining how you'll ensure maximum diversity across the 3 options. Then provide the JSON array with exactly 3 unique recipes after saying 'MEAL_SUGGESTIONS_COMPLETE'."

        # Set up tools for web search if enabled
        tools = None
        if search_online:
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
                    ],
                }
            ]

            search_query = f"{meal_type} recipes diverse cuisines"
            if preferred_cuisines:
                search_query = f"{' '.join(preferred_cuisines)} {meal_type} recipes"

            user_prompt = f"""First, search the web for "{search_query}" to get inspiration for diverse recipes, then create 3 completely different original recipes.

{user_prompt}"""

        try:
            # Create streaming response with proper tools handling
            stream_args = {
                "model": "claude-sonnet-4-20250514",  # Use same model as recipe generation
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
                current_content_type = None
                stop_streaming = False
                content_received = False  # Track if we received any content

                try:
                    for chunk in stream:
                        content_received = True  # Mark that we got some response

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
                                    yield f"data: {json.dumps({'type': 'thinking_start', 'message': 'Planning diverse meals...'})}\n\n"

                        elif chunk.type == "content_block_delta":
                            if hasattr(chunk.delta, "text"):
                                text_chunk = chunk.delta.text
                                accumulated_text += text_chunk

                                # Check if we've hit the completion marker
                                if "MEAL_SUGGESTIONS_COMPLETE" in accumulated_text:
                                    # Send a completion status and stop streaming content to user
                                    yield f"data: {json.dumps({'type': 'status', 'message': 'Meal planning complete! Finalizing diverse suggestions...'})}\n\n"
                                    stop_streaming = True
                                    continue

                                # Use the stored content type to determine stream type
                                if current_content_type == "thinking":
                                    # Filter out any completion markers from thinking content
                                    completion_markers = [
                                        "MEAL_SUGGESTIONS_COMPLETE",
                                        "RECIPE_COMPLETE",
                                        "MEAL_SUGGESTIONS",
                                    ]
                                    if not any(
                                        marker in text_chunk
                                        for marker in completion_markers
                                    ):
                                        accumulated_thinking += text_chunk
                                        yield f"data: {json.dumps({'type': 'thinking', 'chunk': text_chunk})}\n\n"
                                else:
                                    # Stream content to user
                                    yield f"data: {json.dumps({'type': 'content', 'chunk': text_chunk})}\n\n"

                        elif chunk.type == "content_block_stop":
                            # Signal end of a content block
                            if current_content_type == "thinking":
                                yield f"data: {json.dumps({'type': 'thinking_stop', 'message': 'Planning complete'})}\n\n"
                            current_content_type = None  # Reset for next block

                except Exception as stream_error:
                    logger.error(f"❌ Streaming error in meal planning: {stream_error}")
                    # If we haven't received any content, it's likely a connection issue
                    if not content_received:
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Connection error during meal planning: {stream_error}'})}\n\n"
                        return

                # Check if we got any content at all
                if not content_received or not accumulated_text.strip():
                    logger.warning(
                        "⚠️ No content received from Claude for meal planning"
                    )
                    yield f"data: {json.dumps({'type': 'error', 'message': 'No response received from AI. This may be due to rate limiting or connection issues.'})}\n\n"
                    return

                # Extract JSON from after MEAL_SUGGESTIONS_COMPLETE marker
                recipe_json_text = ""
                if "MEAL_SUGGESTIONS_COMPLETE" in accumulated_text:
                    recipe_json_text = accumulated_text.split(
                        "MEAL_SUGGESTIONS_COMPLETE", 1
                    )[1].strip()
                else:
                    recipe_json_text = accumulated_text

                # Log the final accumulated response for debugging
                logger.info(
                    f"📝 Meal suggestions generated, content length: {len(accumulated_text)}, thinking length: {len(accumulated_thinking)}"
                )
                logger.debug(f"🔧 JSON text to parse: {recipe_json_text[:200]}...")

                # Yield the extracted JSON text for processing by the endpoint
                yield recipe_json_text

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Error generating meal suggestions: {e}'})}\n\n"

    async def generate_meal_suggestions(
        self,
        meal_type: str,
        date_str: str,
        servings: int = 4,
        difficulty: Optional[str] = None,
        preferred_cuisines: Optional[List[str]] = None,
        dietary_restrictions: Optional[List[str]] = None,
        must_include_ingredients: Optional[List[str]] = None,
        must_avoid_ingredients: Optional[List[str]] = None,
        already_suggested: Optional[List[str]] = None,
        search_online: bool = True,
    ) -> List[Dict[str, Any]]:
        """Generate 3 diverse recipe suggestions for a specific meal"""

        system_prompt = """You are an expert meal planning AI chef. Your PRIMARY GOAL is to generate EXACTLY 3 COMPLETELY DIFFERENT recipes.

CRITICAL DIVERSITY REQUIREMENTS:
1. Each recipe MUST use a DIFFERENT cuisine type (e.g., Italian, Mexican, Thai, Indian, Mediterranean, Japanese)
2. Each recipe MUST use DIFFERENT primary ingredients and proteins
3. Each recipe MUST use DIFFERENT cooking methods (e.g., grilling, baking, stovetop, slow cooking, stir-frying)
4. Recipe names MUST be completely unique and descriptive
5. NO recipe should be similar to any previously suggested recipes

DIFFICULTY LEVELS:
- Easy: Simple techniques, minimal prep, common ingredients, 15-30 minutes total time
- Medium: Some cooking skills required, moderate prep time, 30-60 minutes total time
- Hard: Advanced techniques, longer prep, specialized ingredients, 60+ minutes total time

WEB SEARCH INSTRUCTIONS:
- If instructed to search the web, look for diverse recipes from different cuisines
- Use search results as inspiration for creating 3 unique, original recipes
- Ensure final recipes match the requested difficulty level
- If you find inspiration from multiple sources, include ALL their URLs in the source_urls array

Recipe difficulty levels: "Easy", "Medium", "Hard"
Cuisine examples: Italian, Chinese, Mexican, Indian, Thai, American, Mediterranean, French, Japanese, Korean, Vietnamese, Middle Eastern, etc.

Each recipe must include:
- name: Clear, appetizing recipe name
- description: Brief 1-2 sentence description
- cuisine: Specific cuisine type
- ingredients: Array of {name, quantity, unit} objects
- instructions: Array of clear step-by-step instructions
- prep_time: Minutes for preparation
- cook_time: Minutes for cooking
- servings: Number of servings
- difficulty: Easy/Medium/Hard
- nutrition: Basic calories estimation per serving
- source_urls: Array of URLs if you found inspiration from web sources

IMPORTANT: Always consider dietary restrictions and preferences. Make recipes diverse but appropriate for the meal type and difficulty level."""

        # Build enhanced user prompt with stronger uniqueness requirements
        user_prompt = f"Generate 3 COMPLETELY DIFFERENT {meal_type} recipes for {date_str}. Each recipe must use a different cuisine, different main ingredients, and different cooking methods."

        # Add difficulty requirement if specified
        if difficulty:
            difficulty_instructions = {
                "easy": "All recipes should be EASY level - simple techniques, minimal prep work, common ingredients, and take no more than 30 minutes total time.",
                "medium": "All recipes should be MEDIUM difficulty - requiring some cooking skills, moderate prep time, and taking 30-60 minutes total time.",
                "hard": "All recipes should be HARD difficulty - using advanced techniques, longer preparation time, specialized ingredients, and taking 60+ minutes total time.",
            }
            if difficulty.lower() in difficulty_instructions:
                user_prompt += f"\n{difficulty_instructions[difficulty.lower()]}"

        if servings != 4:
            user_prompt += f" Serving {servings} people."

        if preferred_cuisines:
            user_prompt += (
                f"\nPreferred cuisines to choose from: {', '.join(preferred_cuisines)}"
            )

        if dietary_restrictions:
            user_prompt += f"\nDietary restrictions: {', '.join(dietary_restrictions)}"

        if must_include_ingredients:
            user_prompt += f"\nMust include these ingredients: {', '.join(must_include_ingredients)}"

        if must_avoid_ingredients:
            user_prompt += (
                f"\nAvoid these ingredients: {', '.join(must_avoid_ingredients)}"
            )

        # Add context about already suggested recipes with stronger language
        if already_suggested and len(already_suggested) > 0:
            user_prompt += f"\n\nCRITICAL: These recipes have ALREADY been suggested this week - DO NOT suggest anything similar: {', '.join(already_suggested)}"
            user_prompt += "\nYou MUST create completely different recipes with different cuisines, ingredients, cooking methods, and names."
            user_prompt += f"\nTotal recipes to avoid: {len(already_suggested)}"

        # Set up tools for web search if enabled
        tools = []
        if search_online:
            tools.append(
                {
                    "type": "web_search_20250305",
                    "name": "web_search",
                    "max_uses": 5,
                    "allowed_domains": [
                        "allrecipes.com",
                        "foodnetwork.com",
                        "seriouseats.com",
                        "simplyrecipes.com",
                        "food.com",
                        "tasteofhome.com",
                    ],
                }
            )

            search_query = f"{meal_type} recipes diverse cuisines"
            if preferred_cuisines:
                search_query = f"{' '.join(preferred_cuisines)} {meal_type} recipes"

            user_prompt = f"""First, search the web for "{search_query}" to get inspiration for diverse recipes, then create 3 completely different original recipes.

{user_prompt}"""

        user_prompt += """

Return as a JSON array with exactly 3 recipes in this format:
[
  {
    "name": "Recipe Name",
    "description": "Brief description",
    "cuisine": "Cuisine Type",
    "ingredients": [
      {"name": "ingredient name", "quantity": 2, "unit": "cups"},
      {"name": "ingredient name", "quantity": 1, "unit": "lb"}
    ],
    "instructions": [
      "Step 1 instructions",
      "Step 2 instructions"
    ],
    "prep_time": 15,
    "cook_time": 30,
    "servings": 4,
    "difficulty": "Easy",
    "nutrition": {"calories": 350}
  }
]"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",  # Use same model as recipe generation
                max_tokens=10000,
                temperature=1.0,  # Must be 1.0 when thinking is enabled
                system=system_prompt,
                thinking={"type": "enabled", "budget_tokens": 5000},
                tools=tools if tools else None,
                messages=[{"role": "user", "content": user_prompt}],
            )

            # Extract text content from response
            response_text = ""
            for content_block in message.content:
                if hasattr(content_block, "text"):
                    response_text += content_block.text

            # Debug logging
            logger.debug(f"Raw meal planning response: {response_text[:500]}...")

            # Parse JSON response
            recipes = self._parse_recipe_suggestions(response_text)

            # Validate we have exactly 3 recipes and check for duplicates
            if len(recipes) != 3:
                logger.warning(f"Warning: Expected 3 recipes, got {len(recipes)}")

            # Check for duplicate names within the 3 recipes
            recipe_names = [recipe.get("name", "") for recipe in recipes]
            if len(set(recipe_names)) != len(recipe_names):
                logger.warning(
                    f"Warning: Duplicate recipe names detected: {recipe_names}"
                )

            # Check for duplicate cuisines within the 3 recipes
            cuisines = [recipe.get("cuisine", "") for recipe in recipes]
            if len(set(cuisines)) != len(cuisines):
                logger.warning(f"Warning: Duplicate cuisines detected: {cuisines}")

            # If we don't have exactly 3 unique recipes, try fallback approach
            if len(recipes) < 3:
                # Pad with simple recipes if needed
                while len(recipes) < 3:
                    fallback = self._get_fallback_recipe(meal_type, servings)
                    # Make sure fallback is unique
                    existing_names = [r.get("name", "") for r in recipes]
                    if fallback["name"] not in existing_names:
                        recipes.append(fallback)
                    else:
                        # Modify fallback name to be unique
                        fallback["name"] = (
                            f"{fallback['name']} (Variation {len(recipes) + 1})"
                        )
                        recipes.append(fallback)
            elif len(recipes) > 3:
                # Take first 3 if we have too many
                recipes = recipes[:3]

            return recipes

        except Exception as e:
            logger.error(f"Error generating meal suggestions: {e}")
            # Return fallback recipes with guaranteed uniqueness
            fallback_recipes = []
            for i in range(3):
                fallback = self._get_fallback_recipe(meal_type, servings)
                fallback["name"] = f"{fallback['name']} (Option {i + 1})"
                fallback_recipes.append(fallback)
            return fallback_recipes

    def _parse_recipe_suggestions(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse recipe suggestions from Claude's response with enhanced error handling"""
        if not response_text or not response_text.strip():
            logger.warning("Empty response text provided to meal planning parser")
            return []

        try:
            # Try to extract JSON from response
            cleaned_text = response_text.strip()

            # Remove markdown code blocks if present
            if "```json" in cleaned_text:
                start = cleaned_text.find("```json") + 7
                end = cleaned_text.find("```", start)
                if end != -1:
                    cleaned_text = cleaned_text[start:end].strip()
            elif cleaned_text.startswith("```"):
                start = cleaned_text.find("```") + 3
                end = cleaned_text.rfind("```")
                if end != -1:
                    cleaned_text = cleaned_text[start:end].strip()

            # First try to parse directly
            try:
                parsed_data = json.loads(cleaned_text)
            except json.JSONDecodeError:
                # Try more advanced JSON extraction using brace matching
                logger.info(
                    "Direct JSON parsing failed, attempting advanced extraction..."
                )
                parsed_data = self._extract_json_from_text(cleaned_text)
                if not parsed_data:
                    logger.error(
                        f"Could not extract JSON from meal planning response. Text length: {len(response_text)}"
                    )
                    logger.debug(f"Response preview: {response_text[:500]}...")
                    return []

            # Handle both direct array and wrapped object formats
            if isinstance(parsed_data, list):
                recipes = parsed_data
            elif isinstance(parsed_data, dict) and "recipes" in parsed_data:
                recipes = parsed_data["recipes"]
            else:
                logger.error(
                    f"Unexpected JSON structure in meal planning: {type(parsed_data)}"
                )
                logger.debug(
                    f"Parsed data keys: {list(parsed_data.keys()) if isinstance(parsed_data, dict) else 'Not a dict'}"
                )
                return []

            # Validate each recipe has required fields
            validated_recipes = []
            for i, recipe in enumerate(recipes):
                if self._validate_recipe(recipe):
                    validated_recipes.append(recipe)
                else:
                    logger.warning(
                        f"Skipping invalid recipe {i + 1} in meal planning: {recipe.get('name', 'Unknown')}"
                    )
                    # Try to fix the recipe if possible
                    fixed_recipe = self._fix_recipe(recipe)
                    if fixed_recipe and self._validate_recipe(fixed_recipe):
                        logger.info(
                            f"Successfully fixed recipe: {fixed_recipe.get('name', 'Unknown')}"
                        )
                        validated_recipes.append(fixed_recipe)

            logger.info(
                f"✅ Successfully parsed {len(validated_recipes)} valid recipes from meal planning response"
            )
            return validated_recipes

        except Exception as e:
            logger.error(f"Error parsing recipe suggestions in meal planning: {e}")
            logger.debug(f"Full response text: {response_text}")
            return []

    def _extract_json_from_text(self, text: str) -> Optional[Dict]:
        """Extract JSON from text using brace matching - similar to recipe agent"""
        # First try to find a complete JSON object spanning multiple lines
        brace_count = 0
        start_pos = -1

        for i, char in enumerate(text):
            if char == "{" or char == "[":
                if brace_count == 0:
                    start_pos = i
                brace_count += 1
            elif char == "}" or char == "]":
                brace_count -= 1
                if brace_count == 0 and start_pos != -1:
                    # Found a complete JSON object
                    potential_json = text[start_pos : i + 1]
                    try:
                        parsed = json.loads(potential_json)
                        logger.info(
                            f"✅ Successfully extracted JSON from position {start_pos} to {i + 1}"
                        )
                        return parsed
                    except json.JSONDecodeError:
                        continue

        # If still no JSON found, try regex patterns
        import re

        json_pattern = r"[\[\{][^\[\]{}]*(?:[\[\{][^\[\]{}]*[\]\}][^\[\]{}]*)*[\]\}]"
        json_matches = re.findall(json_pattern, text, re.DOTALL)

        for match in json_matches:
            try:
                parsed = json.loads(match)
                logger.info("✅ Found valid JSON via regex")
                return parsed
            except json.JSONDecodeError:
                continue

        return None

    def _fix_recipe(self, recipe: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Attempt to fix common issues in recipe data"""
        try:
            fixed = recipe.copy()

            # Fix missing or invalid fields
            if "name" not in fixed or not fixed["name"]:
                fixed["name"] = "Untitled Recipe"

            if "description" not in fixed or not fixed["description"]:
                fixed["description"] = "A delicious recipe"

            if "cuisine" not in fixed or not fixed["cuisine"]:
                fixed["cuisine"] = "International"

            if "ingredients" not in fixed or not isinstance(fixed["ingredients"], list):
                fixed["ingredients"] = [
                    {"name": "placeholder ingredient", "quantity": 1, "unit": "item"}
                ]

            if "instructions" not in fixed or not isinstance(
                fixed["instructions"], list
            ):
                fixed["instructions"] = ["Follow recipe instructions"]

            if "prep_time" not in fixed:
                fixed["prep_time"] = 15

            if "cook_time" not in fixed:
                fixed["cook_time"] = 30

            if "servings" not in fixed:
                fixed["servings"] = 4

            if "difficulty" not in fixed:
                fixed["difficulty"] = "Medium"

            if "nutrition" not in fixed:
                fixed["nutrition"] = {"calories": 350}

            return fixed
        except Exception as e:
            logger.error(f"Error fixing recipe: {e}")
            return None

    def _validate_recipe(self, recipe: Dict[str, Any]) -> bool:
        """Validate that a recipe has all required fields - more lenient validation"""
        if not isinstance(recipe, dict):
            logger.error("Recipe must be a dictionary")
            return False

        # Only require essential fields
        essential_fields = ["name", "ingredients", "instructions"]

        for field in essential_fields:
            if field not in recipe:
                logger.warning(f"Recipe missing essential field: {field}")
                return False

            # Check if field is empty
            if not recipe[field]:
                logger.warning(f"Recipe has empty essential field: {field}")
                return False

        # Validate ingredients format - be more lenient
        if not isinstance(recipe["ingredients"], list):
            logger.warning("Ingredients must be a list")
            return False

        if len(recipe["ingredients"]) == 0:
            logger.warning("Recipe must have at least one ingredient")
            return False

        # Check ingredients are reasonably formatted
        for i, ingredient in enumerate(recipe["ingredients"]):
            if not isinstance(ingredient, dict):
                logger.warning(f"Ingredient {i + 1} must be a dictionary")
                return False
            if "name" not in ingredient or not ingredient["name"]:
                logger.warning(f"Ingredient {i + 1} must have a name")
                return False

        # Validate instructions format - be more lenient
        if not isinstance(recipe["instructions"], list):
            logger.warning("Instructions must be a list")
            return False

        if len(recipe["instructions"]) == 0:
            logger.warning("Recipe must have at least one instruction")
            return False

        # Optional fields - just log warnings if missing
        optional_fields = [
            "description",
            "cuisine",
            "prep_time",
            "cook_time",
            "servings",
            "difficulty",
        ]
        for field in optional_fields:
            if field not in recipe:
                logger.debug(
                    f"Recipe missing optional field: {field} - will use default"
                )

        return True

    def _get_fallback_recipe(self, meal_type: str, servings: int) -> Dict[str, Any]:
        """Return a simple fallback recipe if AI generation fails"""

        fallback_recipes = {
            "breakfast": [
                {
                    "name": "Classic Scrambled Eggs",
                    "description": "Fluffy scrambled eggs with herbs",
                    "cuisine": "American",
                    "ingredients": [
                        {"name": "eggs", "quantity": 8, "unit": "large"},
                        {"name": "butter", "quantity": 2, "unit": "tbsp"},
                        {"name": "salt", "quantity": 1, "unit": "tsp"},
                        {"name": "pepper", "quantity": 0.5, "unit": "tsp"},
                    ],
                    "instructions": [
                        "Crack eggs into a bowl and whisk",
                        "Heat butter in pan over medium heat",
                        "Add eggs and gently scramble until set",
                    ],
                    "prep_time": 5,
                    "cook_time": 10,
                    "servings": servings,
                    "difficulty": "Easy",
                    "nutrition": {"calories": 280},
                },
                {
                    "name": "French Toast",
                    "description": "Golden crispy French toast with cinnamon",
                    "cuisine": "French",
                    "ingredients": [
                        {"name": "bread slices", "quantity": 8, "unit": "slices"},
                        {"name": "eggs", "quantity": 3, "unit": "large"},
                        {"name": "milk", "quantity": 0.5, "unit": "cup"},
                        {"name": "cinnamon", "quantity": 1, "unit": "tsp"},
                    ],
                    "instructions": [
                        "Whisk eggs, milk and cinnamon",
                        "Dip bread in mixture",
                        "Cook in pan until golden brown",
                    ],
                    "prep_time": 10,
                    "cook_time": 15,
                    "servings": servings,
                    "difficulty": "Easy",
                    "nutrition": {"calories": 320},
                },
                {
                    "name": "Greek Yogurt Parfait",
                    "description": "Layered yogurt with granola and berries",
                    "cuisine": "Mediterranean",
                    "ingredients": [
                        {"name": "Greek yogurt", "quantity": 2, "unit": "cups"},
                        {"name": "granola", "quantity": 1, "unit": "cup"},
                        {"name": "mixed berries", "quantity": 2, "unit": "cups"},
                        {"name": "honey", "quantity": 3, "unit": "tbsp"},
                    ],
                    "instructions": [
                        "Layer yogurt in glasses",
                        "Add berries and granola",
                        "Drizzle with honey",
                    ],
                    "prep_time": 10,
                    "cook_time": 0,
                    "servings": servings,
                    "difficulty": "Easy",
                    "nutrition": {"calories": 250},
                },
            ],
            "lunch": [
                {
                    "name": "Mediterranean Garden Salad",
                    "description": "Fresh mixed greens with olives and feta",
                    "cuisine": "Mediterranean",
                    "ingredients": [
                        {"name": "mixed greens", "quantity": 8, "unit": "cups"},
                        {"name": "cherry tomatoes", "quantity": 2, "unit": "cups"},
                        {"name": "cucumber", "quantity": 1, "unit": "large"},
                        {"name": "feta cheese", "quantity": 0.5, "unit": "cup"},
                    ],
                    "instructions": [
                        "Wash and dry greens",
                        "Chop vegetables",
                        "Toss with olive oil and seasonings",
                    ],
                    "prep_time": 15,
                    "cook_time": 0,
                    "servings": servings,
                    "difficulty": "Easy",
                    "nutrition": {"calories": 180},
                },
                {
                    "name": "Turkey and Avocado Wrap",
                    "description": "Whole wheat wrap with fresh turkey and avocado",
                    "cuisine": "American",
                    "ingredients": [
                        {
                            "name": "whole wheat tortillas",
                            "quantity": 4,
                            "unit": "large",
                        },
                        {"name": "sliced turkey", "quantity": 1, "unit": "lb"},
                        {"name": "avocado", "quantity": 2, "unit": "large"},
                        {"name": "lettuce", "quantity": 4, "unit": "cups"},
                    ],
                    "instructions": [
                        "Lay out tortillas",
                        "Add turkey, avocado and lettuce",
                        "Roll up tightly and slice",
                    ],
                    "prep_time": 10,
                    "cook_time": 0,
                    "servings": servings,
                    "difficulty": "Easy",
                    "nutrition": {"calories": 320},
                },
                {
                    "name": "Asian Chicken Stir Fry",
                    "description": "Quick stir-fried chicken with vegetables",
                    "cuisine": "Asian",
                    "ingredients": [
                        {"name": "chicken breast", "quantity": 1, "unit": "lb"},
                        {"name": "mixed vegetables", "quantity": 3, "unit": "cups"},
                        {"name": "soy sauce", "quantity": 3, "unit": "tbsp"},
                        {"name": "ginger", "quantity": 1, "unit": "tbsp"},
                    ],
                    "instructions": [
                        "Cut chicken into strips",
                        "Stir-fry chicken until cooked",
                        "Add vegetables and sauce",
                    ],
                    "prep_time": 15,
                    "cook_time": 12,
                    "servings": servings,
                    "difficulty": "Medium",
                    "nutrition": {"calories": 280},
                },
            ],
            "dinner": [
                {
                    "name": "Spaghetti with Marinara",
                    "description": "Classic pasta with tomato sauce",
                    "cuisine": "Italian",
                    "ingredients": [
                        {"name": "spaghetti", "quantity": 1, "unit": "lb"},
                        {"name": "marinara sauce", "quantity": 2, "unit": "cups"},
                        {"name": "parmesan cheese", "quantity": 0.5, "unit": "cup"},
                        {"name": "garlic", "quantity": 3, "unit": "cloves"},
                    ],
                    "instructions": [
                        "Cook pasta according to package directions",
                        "Heat marinara sauce with garlic",
                        "Serve pasta with sauce and cheese",
                    ],
                    "prep_time": 10,
                    "cook_time": 20,
                    "servings": servings,
                    "difficulty": "Easy",
                    "nutrition": {"calories": 400},
                },
                {
                    "name": "Grilled Chicken with Vegetables",
                    "description": "Herb-seasoned grilled chicken with roasted vegetables",
                    "cuisine": "American",
                    "ingredients": [
                        {"name": "chicken breasts", "quantity": 4, "unit": "pieces"},
                        {"name": "mixed vegetables", "quantity": 3, "unit": "cups"},
                        {"name": "olive oil", "quantity": 3, "unit": "tbsp"},
                        {"name": "herbs", "quantity": 2, "unit": "tbsp"},
                    ],
                    "instructions": [
                        "Season chicken with herbs",
                        "Grill chicken until cooked through",
                        "Roast vegetables with olive oil",
                    ],
                    "prep_time": 15,
                    "cook_time": 25,
                    "servings": servings,
                    "difficulty": "Medium",
                    "nutrition": {"calories": 350},
                },
                {
                    "name": "Mexican Bean and Rice Bowl",
                    "description": "Hearty bowl with black beans, rice and salsa",
                    "cuisine": "Mexican",
                    "ingredients": [
                        {"name": "brown rice", "quantity": 1.5, "unit": "cups"},
                        {"name": "black beans", "quantity": 2, "unit": "cups"},
                        {"name": "salsa", "quantity": 1, "unit": "cup"},
                        {"name": "avocado", "quantity": 1, "unit": "large"},
                    ],
                    "instructions": [
                        "Cook rice according to package directions",
                        "Heat black beans with spices",
                        "Serve in bowls with toppings",
                    ],
                    "prep_time": 10,
                    "cook_time": 30,
                    "servings": servings,
                    "difficulty": "Easy",
                    "nutrition": {"calories": 380},
                },
            ],
        }

        # Get recipes for the meal type, fallback to dinner if not found
        available_recipes = fallback_recipes.get(meal_type, fallback_recipes["dinner"])

        # Return a random recipe from the available options
        return random.choice(available_recipes)

    async def generate_weekly_meal_plan(
        self,
        cooking_days: List[str],
        meal_types: List[str],
        start_date: str,
        servings: int = 4,
        difficulty: Optional[str] = None,
        preferred_cuisines: Optional[List[str]] = None,
        dietary_restrictions: Optional[List[str]] = None,
        must_include_ingredients: Optional[List[str]] = None,
        must_avoid_ingredients: Optional[List[str]] = None,
        search_online: bool = True,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Generate a complete weekly meal plan ensuring diversity across all meals"""

        # Track already suggested recipes to ensure uniqueness across the entire week
        already_suggested = []
        weekly_suggestions = {}

        # Generate recipes for each day and meal type combination
        for day in cooking_days:
            for meal_type in meal_types:
                meal_key = f"{day.lower()}_{meal_type}"
                date_str = f"{day}, {start_date.split(' of ')[1] if ' of ' in start_date else start_date}"

                try:
                    logger.info(
                        f"🍳 Generating {meal_type} for {day} (key: {meal_key})"
                    )

                    # Generate 3 suggestions for this meal slot
                    suggestions = await self.generate_meal_suggestions(
                        meal_type=meal_type,
                        date_str=date_str,
                        servings=servings,
                        difficulty=difficulty,
                        preferred_cuisines=preferred_cuisines,
                        dietary_restrictions=dietary_restrictions,
                        must_include_ingredients=must_include_ingredients,
                        must_avoid_ingredients=must_avoid_ingredients,
                        already_suggested=already_suggested.copy(),  # Pass copy to avoid modification
                        search_online=search_online,
                    )

                    # Add recipe names to the tracking list
                    for suggestion in suggestions:
                        if suggestion.get("name"):
                            already_suggested.append(suggestion["name"])

                    weekly_suggestions[meal_key] = suggestions
                    logger.info(
                        f"✅ Generated {len(suggestions)} suggestions for {meal_key}"
                    )

                except Exception as e:
                    logger.error(f"❌ Error generating {meal_key}: {e}")
                    # Add fallback suggestions
                    fallback_suggestions = []
                    for i in range(3):
                        fallback = self._get_fallback_recipe(meal_type, servings)
                        fallback["name"] = f"{fallback['name']} ({day} Option {i + 1})"
                        already_suggested.append(fallback["name"])
                        fallback_suggestions.append(fallback)
                    weekly_suggestions[meal_key] = fallback_suggestions

        logger.info(
            f"🎯 Generated weekly meal plan with {len(weekly_suggestions)} meal slots and {len(already_suggested)} total recipes"
        )
        return weekly_suggestions


# Create singleton instance
meal_planning_agent = MealPlanningAgent()
