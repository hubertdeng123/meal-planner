from __future__ import annotations
import json
import logging
from typing import Any, Iterator
from app.agents.unified_culinary_agent import UnifiedCulinaryAgent
from app.schemas.meal_plan import RecipeSuggestion
from app.core.config import RECIPE_WEB_SEARCH_ALLOWED_DOMAINS

logger = logging.getLogger(__name__)


class MealPlanningAgent(UnifiedCulinaryAgent):
    """
    Specialized agent for meal planning and weekly schedule generation.
    Inherits shared functionality from UnifiedCulinaryAgent.
    """

    def __init__(self):
        super().__init__()

    def generate_meal_suggestions_stream(
        self,
        meal_type: str,
        date_str: str,
        servings: int = 4,
        difficulty: str | None = None,
        preferred_cuisines: list[str] | None = None,
        dietary_restrictions: list[str] | None = None,
        must_include_ingredients: list[str] | None = None,
        must_avoid_ingredients: list[str] | None = None,
        already_suggested: list[str] | None = None,
        user_preferences: dict[str, Any] | None = None,
        search_online: bool = True,
    ) -> Iterator[str]:
        """Generate 3 diverse recipe suggestions for a specific meal with streaming response"""

        system_prompt = """You are an expert meal planning AI chef. Your PRIMARY GOAL is to generate EXACTLY 3 COMPLETELY DIFFERENT recipes that are personalized to the user's preferences.

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
When thinking through your response, write in clear, complete sentences that flow naturally.
Do not use markdown formatting, bullet points, or special characters in your thinking.
Think aloud as if you're explaining your reasoning to a colleague in simple, conversational language.

Think through your meal planning approach naturally, paying special attention to the user's preferences and requirements.

IMPORTANT: When user preferences are provided, discuss how you're incorporating them:
- Acknowledge their dietary restrictions and nutritional goals
- Explain how you're using their favorite ingredients and avoiding disliked ones
- Consider their cooking time constraints and skill level
- Show how you're meeting their spice level preferences
- Address their protein preferences and cooking method preferences
- Explain how the recipes fit their nutritional targets (calories, sodium, etc.)

Express your thinking naturally like: "I notice the user prefers Mediterranean flavors and wants to keep meals under 400 calories, so I'll focus on lean proteins with herbs and vegetables. They also mentioned avoiding dairy, so I'll use olive oil instead of cheese for richness."

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

        user_prompt = f"Generate 3 COMPLETELY DIFFERENT {meal_type} recipes for {date_str}. Each recipe must use a different cuisine, different main ingredients, and different cooking methods."

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

        if already_suggested and len(already_suggested) > 0:
            user_prompt += f"\n\nCRITICAL: These recipes have ALREADY been suggested this week - DO NOT suggest anything similar: {', '.join(already_suggested)}"
            user_prompt += "\nYou MUST create completely different recipes with different cuisines, ingredients, cooking methods, and names."
            user_prompt += f"\nTotal recipes to avoid: {len(already_suggested)}"

        if user_preferences:
            user_prompt += self._build_enhanced_preferences_prompt(user_preferences)

        user_prompt += "\n\nThink through your recipe choices naturally, explaining how you'll ensure maximum diversity across the 3 options. Then provide the JSON array with exactly 3 unique recipes after saying 'MEAL_SUGGESTIONS_COMPLETE'."

        tools: list[dict[str, str | int]] | None = None
        if search_online:
            tools = [
                {
                    "type": "web_search_20250305",
                    "name": "web_search",
                    "max_uses": 3,
                    "allowed_domains": RECIPE_WEB_SEARCH_ALLOWED_DOMAINS,
                }
            ]

            search_query = f"{meal_type} recipes diverse cuisines"
            if preferred_cuisines:
                search_query = f"{' '.join(preferred_cuisines)} {meal_type} recipes"

            user_prompt = f"""First, search the web for "{search_query}" to get inspiration for diverse recipes, then create 3 completely different original recipes.

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
                # Handle special meal planning streaming logic
                if "data:" in chunk and "type" in chunk:
                    # Pass through streaming events
                    yield chunk
                elif "MEAL_SUGGESTIONS_COMPLETE" in chunk:
                    yield f"data: {json.dumps({'type': 'status', 'message': 'Meal planning complete! Finalizing diverse suggestions...'})}\n\n"

                    # Extract JSON after marker
                    recipe_json_text = chunk.split("MEAL_SUGGESTIONS_COMPLETE", 1)[
                        1
                    ].strip()

                    logger.info("📝 Meal suggestions generated")
                    # Use proper SSE format for completion
                    yield recipe_json_text
                    return
                else:
                    # Accumulate text for final parsing
                    accumulated_text += chunk

            # If we didn't find the completion marker, parse the full text
            if accumulated_text and "MEAL_SUGGESTIONS_COMPLETE" not in accumulated_text:
                logger.info("📝 Meal suggestions generated (no marker found)")
                yield accumulated_text

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Error generating meal suggestions: {e}'})}\n\n"

    async def generate_meal_suggestions(
        self,
        meal_type: str,
        date_str: str,
        servings: int = 4,
        difficulty: str | None = None,
        preferred_cuisines: list[str] | None = None,
        dietary_restrictions: list[str] | None = None,
        must_include_ingredients: list[str] | None = None,
        must_avoid_ingredients: list[str] | None = None,
        already_suggested: list[str] | None = None,
        search_online: bool = True,
        user_preferences: dict[str, str | int | float | dict | list] | None = None,
    ) -> list[RecipeSuggestion]:
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

        user_prompt = f"Generate 3 COMPLETELY DIFFERENT {meal_type} recipes for {date_str}. Each recipe must use a different cuisine, different main ingredients, and different cooking methods."

        # Add user preferences early so they're prominently considered
        if user_preferences:
            user_prompt += self._build_enhanced_preferences_prompt(user_preferences)

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

        if already_suggested and len(already_suggested) > 0:
            user_prompt += f"\n\nCRITICAL: These recipes have ALREADY been suggested this week - DO NOT suggest anything similar: {', '.join(already_suggested)}"
            user_prompt += "\nYou MUST create completely different recipes with different cuisines, ingredients, cooking methods, and names."
            user_prompt += f"\nTotal recipes to avoid: {len(already_suggested)}"

        tools: list[dict[str, str | int]] = []
        if search_online:
            tools.append(
                {
                    "type": "web_search_20250305",
                    "name": "web_search",
                    "max_uses": 5,
                    "allowed_domains": RECIPE_WEB_SEARCH_ALLOWED_DOMAINS,
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
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                temperature=1.0,
                system=system_prompt,
                thinking={"type": "enabled", "budget_tokens": 3000},
                tools=tools if tools else None,
                messages=[{"role": "user", "content": user_prompt}],
            )

            response_text = ""
            for content_block in message.content:
                if hasattr(content_block, "text"):
                    response_text += content_block.text

            logger.debug(f"Raw meal planning response: {response_text[:500]}...")

            recipes = self._parse_recipe_suggestions(response_text)

            if len(recipes) != 3:
                logger.warning(f"Warning: Expected 3 recipes, got {len(recipes)}")

            recipe_names = [r.name for r in recipes]
            if len(set(recipe_names)) != len(recipe_names):
                logger.warning(
                    f"Warning: Duplicate recipe names detected: {recipe_names}"
                )

            cuisines = [r.cuisine for r in recipes]
            if len(set(cuisines)) != len(cuisines):
                logger.warning(f"Warning: Duplicate cuisines detected: {cuisines}")

            if len(recipes) < 3:
                while len(recipes) < 3:
                    fallback = self._get_fallback_recipe(meal_type, servings)
                    existing_names = [r.name for r in recipes]
                    if fallback.name not in existing_names:
                        recipes.append(fallback)
                    else:
                        fallback.name = (
                            f"{fallback.name} (Variation {len(recipes) + 1})"
                        )
                        recipes.append(fallback)
            elif len(recipes) > 3:
                recipes = recipes[:3]

            return recipes

        except Exception as e:
            logger.error(f"Error generating meal suggestions: {e}")
            fallback_recipes = []
            for i in range(3):
                fallback = self._get_fallback_recipe(meal_type, servings)
                fallback.name = f"{fallback.name} (Option {i + 1})"
                fallback_recipes.append(fallback)
            return fallback_recipes

    def _parse_recipe_suggestions(self, response_text: str) -> list[RecipeSuggestion]:
        """Safely parse recipe suggestions from Claude's response"""
        try:
            json_text = self._extract_json_from_text(response_text)
            if json_text:
                data = json.loads(json_text)
                if isinstance(data, list):
                    validated_recipes = []
                    for r in data:
                        if isinstance(r, dict):
                            fixed_recipe = self._fix_recipe(r)
                            if fixed_recipe and self._validate_recipe(fixed_recipe):
                                validated_recipes.append(
                                    RecipeSuggestion(**fixed_recipe)
                                )
                    return validated_recipes

            return []

        except json.JSONDecodeError as e:
            logger.error(f"JSON decoding failed: {e}")
            logger.debug(f"Response text that failed to parse: {response_text}")
            return []

    async def generate_weekly_meal_plan(
        self,
        cooking_days: list[str],
        meal_types: list[str],
        start_date: str,
        servings: int = 4,
        difficulty: str | None = None,
        preferred_cuisines: list[str] | None = None,
        dietary_restrictions: list[str] | None = None,
        must_include_ingredients: list[str] | None = None,
        must_avoid_ingredients: list[str] | None = None,
        search_online: bool = True,
        user_preferences: dict[str, str | int | float | dict | list] | None = None,
    ) -> dict[str, list[RecipeSuggestion]]:
        """Generate a complete weekly meal plan with diverse recipes"""

        system_prompt = """You are an expert meal planning AI for an entire week. Your goal is to create a diverse and cohesive meal plan that's highly personalized to the user's preferences.

CRITICAL DIVERSITY REQUIREMENTS for the WHOLE WEEK:
1.  **Cuisine Variety**: Do not repeat a cuisine more than twice in the entire week.
2.  **Protein Variety**: Rotate proteins (chicken, beef, fish, vegetarian) throughout the week.
3.  **Ingredient Overlap**: Smartly reuse some common ingredients (like onions, carrots) but ensure main ingredients are diverse.
4.  **No Duplicates**: EVERY recipe name must be unique.

PERSONALIZATION REQUIREMENTS:
When user preferences are provided, think through how to incorporate them across the entire week:
- Explain how you're balancing their favorite cuisines throughout the week
- Show how you're incorporating their preferred ingredients and avoiding disliked ones
- Consider their nutritional goals (calories, protein, sodium limits) for each day
- Address their cooking time constraints and skill level preferences
- Ensure recipes match their spice level and flavor profile preferences
- Plan around their dietary restrictions consistently

THINKING PROCESS:
When thinking through your response, write in clear, complete sentences that flow naturally.
Do not use markdown formatting, bullet points, or special characters in your thinking.
Think aloud as if you're explaining your reasoning to a colleague in simple, conversational language.

Express your reasoning naturally, like: "The user loves Mediterranean and Asian flavors but wants to stay under 500 calories per meal. I'll plan 2 Mediterranean meals and 2 Asian meals this week, using lots of vegetables and lean proteins. Since they need to avoid dairy, I'll use olive oil and tahini for richness instead of cheese."

OUTPUT FORMAT:
Return a single JSON object. The keys should be in the format "weekday_mealtype" (e.g., "monday_dinner").
The value for each key should be an array of EXACTLY 3 diverse recipe suggestions.

Example:
{
  "monday_lunch": [ {recipe1}, {recipe2}, {recipe3} ],
  "wednesday_dinner": [ {recipe4}, {recipe5}, {recipe6} ]
}

Each recipe object must follow this structure:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "cuisine": "Cuisine Type",
  "ingredients": [{"name": "ingredient", "quantity": 1.5, "unit": "cups"}],
  "instructions": ["Step 1", ...],
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "difficulty": "Easy/Medium/Hard",
  "nutrition": {"calories": 350},
  "source_urls": ["https://..."]
}

IMPORTANT: Consider all user preferences and restrictions for every recipe generated."""

        user_prompt = f"Generate a weekly meal plan starting {start_date} for the following days: {', '.join(cooking_days)}."
        user_prompt += f"\nPlan these meals: {', '.join(meal_types)}."
        user_prompt += f"\nEach meal should serve {servings} people."

        # Add user preferences early so they're prominently considered in planning
        if user_preferences:
            user_prompt += self._build_enhanced_preferences_prompt(user_preferences)

        if difficulty:
            user_prompt += f"\nOverall difficulty should be {difficulty}."

        if dietary_restrictions:
            user_prompt += f"\nApply these dietary restrictions to ALL recipes: {', '.join(dietary_restrictions)}"

        if preferred_cuisines:
            user_prompt += (
                f"\nPrioritize these cuisines: {', '.join(preferred_cuisines)}"
            )

        if must_include_ingredients:
            user_prompt += f"\nTry to include these ingredients: {', '.join(must_include_ingredients)}"

        if must_avoid_ingredients:
            user_prompt += f"\nStrictly avoid these ingredients: {', '.join(must_avoid_ingredients)}"

        user_prompt += (
            "\n\nReturn a single JSON object with all meal suggestions for the week."
        )

        # Calculate estimated token needs based on meal plan size
        total_meals = len(cooking_days) * len(meal_types)
        # More aggressive token allocation for large weekly plans
        max_tokens = min(12000, 4000 + (total_meals * 800))  # Base + per meal
        thinking_budget = min(4000, 2000 + (total_meals * 200))  # Scaled thinking

        tools = None
        if search_online:
            tools = self._build_web_search_tools(max_uses=5)
            search_query = (
                f"weekly meal plan {' '.join(preferred_cuisines or [])} recipes"
            )
            user_prompt = f"""First, search the web for "{search_query}" to get inspiration for diverse weekly meal planning, then create the complete meal plan.

{user_prompt}"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=max_tokens,
                temperature=0.8,
                system=system_prompt,
                thinking={"type": "enabled", "budget_tokens": thinking_budget},
                tools=tools if tools else None,
                messages=[{"role": "user", "content": user_prompt}],
            )

            response_text = ""
            for content_block in message.content:
                if hasattr(content_block, "text"):
                    response_text += content_block.text

            return self._parse_weekly_meal_plan(response_text)

        except Exception as e:
            logger.error(f"Error generating weekly meal plan: {e}")
            return {}

    def _parse_weekly_meal_plan(
        self, response_text: str
    ) -> dict[str, list[RecipeSuggestion]]:
        """Parse weekly meal plan response from Claude"""
        if not response_text or not response_text.strip():
            logger.warning("Empty response text for weekly meal plan")
            return {}

        try:
            json_text = self._extract_json_from_text(response_text)
            if not json_text:
                logger.warning("No JSON found in weekly meal plan response")
                return {}

            data = json.loads(json_text)

            if isinstance(data, dict):
                validated_plan = {}
                for key, recipes in data.items():
                    if isinstance(recipes, list):
                        validated_recipes = []
                        for r in recipes:
                            if isinstance(r, dict):
                                fixed_recipe = self._fix_recipe(r)
                                if fixed_recipe and self._validate_recipe(fixed_recipe):
                                    validated_recipes.append(
                                        RecipeSuggestion(**fixed_recipe)
                                    )
                        if validated_recipes:
                            validated_plan[key] = validated_recipes
                return validated_plan

            return {}

        except json.JSONDecodeError as e:
            logger.error(f"Weekly plan JSON decoding failed: {e}")
            logger.debug(f"Response text that failed to parse: {response_text}")
            return {}

    async def generate_daily_meal_plan(
        self,
        date_str: str,
        meal_types: list[str],
        servings: int = 4,
        difficulty: str | None = None,
        preferred_cuisines: list[str] | None = None,
        dietary_restrictions: list[str] | None = None,
        must_include_ingredients: list[str] | None = None,
        must_avoid_ingredients: list[str] | None = None,
        search_online: bool = True,
        user_preferences: dict[str, str | int | float | dict | list] | None = None,
    ) -> dict[str, list[RecipeSuggestion]]:
        """Generate a complete daily meal plan with multiple meal types in one API call"""

        system_prompt = """You are an expert meal planning AI for a full day. Your goal is to create a cohesive daily meal plan with diverse recipes that work well together.

CRITICAL DAILY PLANNING REQUIREMENTS:
1. **Meal Variety**: Each meal must use DIFFERENT cuisines and cooking methods
2. **Nutritional Balance**: Plan the day's nutrition across all meals
3. **Ingredient Synergy**: Smart ingredient reuse (e.g., herbs from lunch in dinner)
4. **Prep Efficiency**: Consider overlapping prep work between meals
5. **No Duplicates**: EVERY recipe name must be unique within the day

PERSONALIZATION REQUIREMENTS:
When user preferences are provided, think through how to incorporate them across all meals:
- Explain how you're balancing their nutritional goals across the full day
- Show how you're using their preferred ingredients and avoiding disliked ones
- Consider their time constraints and when they might be cooking each meal
- Address their spice level and flavor preferences consistently
- Plan around their dietary restrictions for all meals

THINKING PROCESS:
When thinking through your response, write in clear, complete sentences that flow naturally.
Do not use markdown formatting, bullet points, or special characters in your thinking.
Think aloud as if you're explaining your reasoning to a colleague in simple, conversational language.

Express your reasoning naturally, like: "For this busy Tuesday, I'll plan a quick Mediterranean breakfast, prep-ahead Asian lunch that uses similar vegetables, and an easy American dinner that balances the day's nutrition."

OUTPUT FORMAT:
Return a single JSON object. The keys should be the meal types (e.g., "breakfast", "lunch", "dinner").
The value for each key should be an array of EXACTLY 3 diverse recipe suggestions.

Example:
{
  "breakfast": [ {recipe1}, {recipe2}, {recipe3} ],
  "lunch": [ {recipe4}, {recipe5}, {recipe6} ],
  "dinner": [ {recipe7}, {recipe8}, {recipe9} ]
}

Each recipe object must follow this structure:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "cuisine": "Cuisine Type",
  "ingredients": [{"name": "ingredient", "quantity": 1.5, "unit": "cups"}],
  "instructions": ["Step 1", ...],
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "difficulty": "Easy/Medium/Hard",
  "nutrition": {"calories": 350},
  "source_urls": ["https://..."]
}

IMPORTANT: Consider all user preferences and restrictions for every recipe generated."""

        user_prompt = f"Generate a complete daily meal plan for {date_str}."
        user_prompt += f"\nPlan these meals: {', '.join(meal_types)}."
        user_prompt += f"\nEach meal should serve {servings} people."

        # Add user preferences early so they're prominently considered in planning
        if user_preferences:
            user_prompt += self._build_enhanced_preferences_prompt(user_preferences)

        if difficulty:
            user_prompt += f"\nOverall difficulty should be {difficulty}."

        if dietary_restrictions:
            user_prompt += f"\nApply these dietary restrictions to ALL recipes: {', '.join(dietary_restrictions)}"

        if preferred_cuisines:
            user_prompt += (
                f"\nPrioritize these cuisines: {', '.join(preferred_cuisines)}"
            )

        if must_include_ingredients:
            user_prompt += f"\nTry to include these ingredients: {', '.join(must_include_ingredients)}"

        if must_avoid_ingredients:
            user_prompt += f"\nStrictly avoid these ingredients: {', '.join(must_avoid_ingredients)}"

        user_prompt += (
            "\n\nReturn a single JSON object with all meal suggestions for the day."
        )

        # Calculate token needs based on number of meals
        max_tokens = min(10000, 3000 + (len(meal_types) * 2000))  # Base + per meal
        thinking_budget = min(3500, 1500 + (len(meal_types) * 500))  # Scaled thinking

        tools = None
        if search_online:
            tools = self._build_web_search_tools(max_uses=3)
            search_query = f"daily meal plan {' '.join(preferred_cuisines or [])} {' '.join(meal_types)} recipes"
            user_prompt = f"""First, search the web for "{search_query}" to get inspiration for diverse daily meal planning, then create the complete meal plan.

{user_prompt}"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=max_tokens,
                temperature=0.8,
                system=system_prompt,
                thinking={"type": "enabled", "budget_tokens": thinking_budget},
                tools=tools if tools else None,
                messages=[{"role": "user", "content": user_prompt}],
            )

            response_text = ""
            for content_block in message.content:
                if hasattr(content_block, "text"):
                    response_text += content_block.text

            return self._parse_daily_meal_plan(response_text)

        except Exception as e:
            logger.error(f"Error generating daily meal plan: {e}")
            return {}

    def _parse_daily_meal_plan(
        self, response_text: str
    ) -> dict[str, list[RecipeSuggestion]]:
        """Parse daily meal plan response from Claude"""
        if not response_text or not response_text.strip():
            logger.warning("Empty response text for daily meal plan")
            return {}

        try:
            json_text = self._extract_json_from_text(response_text)
            if not json_text:
                logger.warning("No JSON found in daily meal plan response")
                return {}

            data = json.loads(json_text)

            if isinstance(data, dict):
                validated_plan = {}
                for meal_type, recipes in data.items():
                    if isinstance(recipes, list):
                        validated_recipes = []
                        for r in recipes:
                            if isinstance(r, dict):
                                fixed_recipe = self._fix_recipe(r)
                                if fixed_recipe and self._validate_recipe(fixed_recipe):
                                    validated_recipes.append(
                                        RecipeSuggestion(**fixed_recipe)
                                    )
                        if validated_recipes:
                            validated_plan[meal_type] = validated_recipes
                return validated_plan

            return {}

        except json.JSONDecodeError as e:
            logger.error(f"Daily plan JSON decoding failed: {e}")
            logger.debug(f"Response text that failed to parse: {response_text}")
            return {}


# Create singleton instance
meal_planning_agent = MealPlanningAgent()
