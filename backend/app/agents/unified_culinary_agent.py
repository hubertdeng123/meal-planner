"""
Unified base agent for all recipe generation and meal planning operations.
Consolidates shared functionality and provides comprehensive user preferences integration.
"""

from __future__ import annotations
import json
import logging
import re
from typing import Any, Dict, Iterator, List, Optional
from anthropic import Anthropic
from app.core.config import settings, RECIPE_WEB_SEARCH_ALLOWED_DOMAINS
from app.schemas.meal_plan import RecipeSuggestion
from app.models import User, RecipeFeedback
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class UnifiedCulinaryAgent:
    """
    Base agent for all culinary AI operations including recipe generation and meal planning.
    Provides shared functionality and comprehensive user preferences integration.
    """

    def __init__(self):
        self._client: Anthropic | None = None

    @property
    def client(self) -> Anthropic:
        """Lazy initialization of Anthropic client"""
        if self._client is None:
            self._client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._client

    def _build_enhanced_preferences_prompt(
        self, user_preferences: Dict[str, Any]
    ) -> str:
        """
        Build a comprehensive prompt section based on enhanced user preferences.
        Supports all user preference types for maximum personalization.
        """
        prompt_parts = []

        # Theme and occasion context
        if user_preferences.get("theme"):
            prompt_parts.append(f"\nMeal plan theme: {user_preferences['theme']}")

        if user_preferences.get("occasion"):
            prompt_parts.append(f"\nSpecial occasion: {user_preferences['occasion']}")

        # Budget considerations
        if user_preferences.get("budget_target"):
            prompt_parts.append(
                f"\nBudget consideration: Target around ${user_preferences['budget_target']:.2f}"
            )

        # Prep time preferences
        if user_preferences.get("prep_time_preference"):
            prep_time_map = {
                "quick": "very quick (under 30 minutes total)",
                "moderate": "moderate (30-60 minutes total)",
                "relaxed": "more relaxed, taking over 60 minutes",
            }
            pref_text = prep_time_map.get(str(user_preferences["prep_time_preference"]))
            if pref_text:
                prompt_parts.append(
                    f"\nUser prefers meals with {pref_text} preparation and cook time."
                )

        # Food preferences and flavor profiles
        food_prefs = user_preferences.get("food_preferences", {})
        if food_prefs:
            # Basic food preferences
            if cuisines := food_prefs.get("cuisines"):
                if isinstance(cuisines, list) and cuisines:
                    prompt_parts.append(f"\nPreferred cuisines: {', '.join(cuisines)}")

            if favorite_ingredients := food_prefs.get("favorite_ingredients"):
                if isinstance(favorite_ingredients, list) and favorite_ingredients:
                    prompt_parts.append(
                        f"\nFavorite ingredients: {', '.join(favorite_ingredients)}"
                    )

            if cooking_methods := food_prefs.get("cooking_methods"):
                if isinstance(cooking_methods, list) and cooking_methods:
                    prompt_parts.append(
                        f"\nPreferred cooking methods: {', '.join(cooking_methods)}"
                    )

            # Enhanced food preferences
            if loved_ingredients := food_prefs.get("loved_ingredients"):
                if isinstance(loved_ingredients, list) and loved_ingredients:
                    prompt_parts.append(
                        f"\nUser particularly enjoys these ingredients: {', '.join(loved_ingredients)}"
                    )

            if disliked_ingredients := food_prefs.get("disliked_ingredients"):
                if isinstance(disliked_ingredients, list) and disliked_ingredients:
                    prompt_parts.append(
                        f"\nUser dislikes these ingredients (avoid when possible): {', '.join(disliked_ingredients)}"
                    )

            if spice_level := food_prefs.get("preferred_spice_level"):
                prompt_parts.append(f"\nPreferred spice level: {spice_level}")

            if flavor_profiles := food_prefs.get("flavor_profiles"):
                if isinstance(flavor_profiles, list) and flavor_profiles:
                    prompt_parts.append(
                        f"\nPreferred flavor profiles: {', '.join(flavor_profiles)}"
                    )

        # Ingredient rules (strict requirements)
        ingredient_rules = user_preferences.get("ingredient_rules", {})
        if ingredient_rules:
            if must_include := ingredient_rules.get("must_include"):
                include_list = []
                for rule in must_include:
                    if isinstance(rule, dict):
                        ingredient = rule.get("ingredient", "")
                        reason = rule.get("reason", "")
                        include_list.append(
                            f"{ingredient}" + (f" ({reason})" if reason else "")
                        )
                    else:
                        include_list.append(str(rule))
                if include_list:
                    prompt_parts.append(
                        f"\nMUST include these ingredients: {', '.join(include_list)}"
                    )

            if must_avoid := ingredient_rules.get("must_avoid"):
                avoid_list = []
                for rule in must_avoid:
                    if isinstance(rule, dict):
                        ingredient = rule.get("ingredient", "")
                        reason = rule.get("reason", "")
                        strictness = rule.get("strictness", "preferred")
                        avoid_list.append(
                            f"{ingredient}"
                            + (f" ({reason}, {strictness})" if reason else "")
                        )
                    else:
                        avoid_list.append(str(rule))
                if avoid_list:
                    prompt_parts.append(
                        f"\nMUST avoid these ingredients: {', '.join(avoid_list)}"
                    )

        # Food type rules (cooking methods, proteins, etc.)
        food_type_rules = user_preferences.get("food_type_rules", {})
        if food_type_rules:
            if preferred_proteins := food_type_rules.get("preferred_proteins"):
                prompt_parts.append(
                    f"\nPreferred protein sources: {', '.join(preferred_proteins)}"
                )

            if cooking_methods := food_type_rules.get("preferred_cooking_methods"):
                prompt_parts.append(
                    f"\nPreferred cooking methods: {', '.join(cooking_methods)}"
                )

            if avoid_methods := food_type_rules.get("avoid_cooking_methods"):
                prompt_parts.append(
                    f"\nAvoid these cooking methods: {', '.join(avoid_methods)}"
                )

            if meal_complexity := food_type_rules.get("preferred_meal_complexity"):
                prompt_parts.append(f"\nPreferred meal complexity: {meal_complexity}")

        # Nutritional rules and targets
        nutritional_rules = user_preferences.get("nutritional_rules", {})
        if nutritional_rules:
            nutrition_goals = []

            # Daily calorie target
            if calorie_target := nutritional_rules.get("daily_calorie_target"):
                nutrition_goals.append(f"~{calorie_target} calories daily")

            # Calorie range
            if calorie_range := nutritional_rules.get("daily_calorie_range"):
                if isinstance(calorie_range, dict):
                    min_cal = calorie_range.get("min")
                    max_cal = calorie_range.get("max")
                    if min_cal and max_cal:
                        nutrition_goals.append(
                            f"{min_cal}-{max_cal} calorie range daily"
                        )
                    elif min_cal:
                        nutrition_goals.append(f"at least {min_cal} calories daily")
                    elif max_cal:
                        nutrition_goals.append(f"at most {max_cal} calories daily")

            # Macro targets in grams
            if macro_targets := nutritional_rules.get("macro_targets"):
                if isinstance(macro_targets, dict):
                    macro_goals = []
                    if protein_g := macro_targets.get("protein_g"):
                        macro_goals.append(f"{protein_g}g protein")
                    if carbs_g := macro_targets.get("carbs_g"):
                        macro_goals.append(f"{carbs_g}g carbs")
                    if fat_g := macro_targets.get("fat_g"):
                        macro_goals.append(f"{fat_g}g fat")
                    if macro_goals:
                        nutrition_goals.append(
                            f"Daily macros: {', '.join(macro_goals)}"
                        )

            # Sodium limit
            if max_sodium := nutritional_rules.get("max_sodium_mg"):
                nutrition_goals.append(f"max {max_sodium}mg sodium daily")

            # Fiber minimum
            if min_fiber := nutritional_rules.get("min_fiber_g"):
                nutrition_goals.append(f"at least {min_fiber}g fiber daily")

            # Sugar limit
            if max_sugar := nutritional_rules.get("max_sugar_g"):
                nutrition_goals.append(f"max {max_sugar}g sugar daily")

            # Special nutritional needs
            if special_needs := nutritional_rules.get("special_nutritional_needs"):
                if isinstance(special_needs, list) and special_needs:
                    nutrition_goals.append(f"Special needs: {', '.join(special_needs)}")

            if nutrition_goals:
                prompt_parts.append(
                    f"\nNutritional goals: {', '.join(nutrition_goals)}"
                )

        # Scheduling rules and time constraints
        scheduling_rules = user_preferences.get("scheduling_rules", {})
        if scheduling_rules:
            if weekday_time := scheduling_rules.get("max_prep_time_weekday"):
                prompt_parts.append(
                    f"\nWeekday cooking time limit: {weekday_time} minutes"
                )

            if weekend_time := scheduling_rules.get("max_prep_time_weekend"):
                prompt_parts.append(
                    f"\nWeekend cooking time limit: {weekend_time} minutes"
                )

            if cooking_frequency := scheduling_rules.get("preferred_cooking_frequency"):
                prompt_parts.append(f"\nCooking frequency: {cooking_frequency}")

        # Dietary rules (medical, lifestyle, temporary)
        dietary_rules = user_preferences.get("dietary_rules", {})
        if dietary_rules:
            if medical_restrictions := dietary_rules.get("medical_restrictions"):
                prompt_parts.append(
                    f"\nMedical dietary restrictions: {', '.join(medical_restrictions)}"
                )

            if lifestyle_choices := dietary_rules.get("lifestyle_choices"):
                prompt_parts.append(
                    f"\nLifestyle dietary choices: {', '.join(lifestyle_choices)}"
                )

            if temporary_goals := dietary_rules.get("temporary_goals"):
                prompt_parts.append(
                    f"\nCurrent dietary goals: {', '.join(temporary_goals)}"
                )

        # Week-specific overrides
        if week_restrictions := user_preferences.get("week_dietary_restrictions"):
            prompt_parts.append(
                f"\nAdditional restrictions for this week: {', '.join(week_restrictions)}"
            )

        if week_prefs := user_preferences.get("week_food_preferences"):
            week_pref_text = []
            for category, items in week_prefs.items():
                if items:
                    week_pref_text.append(f"{category}: {', '.join(items)}")
            if week_pref_text:
                prompt_parts.append(
                    f"\nSpecial preferences for this week: {'; '.join(week_pref_text)}"
                )

        # User's historical patterns (if provided)
        if dietary_restrictions := user_preferences.get("dietary_restrictions"):
            prompt_parts.append(
                f"\nDietary restrictions: {', '.join(dietary_restrictions)}"
            )

        # Special notes
        if special_notes := user_preferences.get("special_notes"):
            notes_text = []
            for key, value in special_notes.items():
                if value:
                    notes_text.append(f"{key}: {value}")
            if notes_text:
                prompt_parts.append(f"\nSpecial notes: {'; '.join(notes_text)}")

        if prompt_parts:
            prompt_parts.insert(0, "\n--- USER PREFERENCES ---")
            prompt_parts.append("\n--- END USER PREFERENCES ---")

        return "".join(prompt_parts)

    def _get_user_feedback_context(
        self, user: User, db: Session, limit: int = 10
    ) -> str:
        """Get user's recipe feedback history for personalization context"""
        try:
            liked_recipes = (
                db.query(RecipeFeedback)
                .filter(
                    RecipeFeedback.user_id == user.id,
                    ((RecipeFeedback.liked.is_(True)) | (RecipeFeedback.rating >= 4)),
                )
                .order_by(RecipeFeedback.rating.desc())
                .limit(limit)
                .all()
            )

            if not liked_recipes:
                return ""

            feedback_summary = []
            for feedback in liked_recipes:
                if feedback.recipe and feedback.recipe.name:
                    rating_text = (
                        f"({feedback.rating}/5)" if feedback.rating else "(liked)"
                    )
                    feedback_summary.append(f"{feedback.recipe.name} {rating_text}")

            if feedback_summary:
                return f"\nUser's previously liked recipes: {'; '.join(feedback_summary[:5])}"

        except Exception as e:
            logger.warning(f"Could not retrieve user feedback: {e}")

        return ""

    def _extract_json_from_text(self, text: str) -> str | None:
        """
        Extracts JSON content from a string, handling markdown code blocks and various formats.
        """
        if not text or not text.strip():
            return None

        # Remove markdown code blocks
        text = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"```\s*", "", text)

        # Pre-process to fix common LLM JSON errors
        # Convert "quantity": 1/4 to "quantity": 0.25
        try:
            # This regex specifically targets unquoted fractions in "quantity" fields
            text = re.sub(
                r'("quantity":\s*)(\d+)/(\d+)',
                lambda m: f"{m.group(1)}{float(m.group(2)) / float(m.group(3))}",
                text,
            )
        except Exception as e:
            logger.warning(f"Failed to fix fractions in JSON response: {e}")
            # If regex fails, continue with original text
            pass

        # Look for JSON array or object
        json_patterns = [
            r"\[.*\]",  # JSON array
            r"\{.*\}",  # JSON object
        ]

        for pattern in json_patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                potential_json = match.group(0).strip()
                try:
                    # Validate it's valid JSON
                    json.loads(potential_json)
                    return potential_json
                except json.JSONDecodeError:
                    continue

        # If no pattern matched, try to find JSON after specific markers
        markers = ["RECIPE_COMPLETE", "MEAL_SUGGESTIONS_COMPLETE", "RECIPES:"]
        for marker in markers:
            if marker in text:
                after_marker = text.split(marker, 1)[1].strip()
                # Try to extract JSON from after the marker
                for pattern in json_patterns:
                    match = re.search(pattern, after_marker, re.DOTALL)
                    if match:
                        potential_json = match.group(0).strip()
                        try:
                            json.loads(potential_json)
                            return potential_json
                        except json.JSONDecodeError:
                            continue

        logger.warning("Could not extract valid JSON from response")
        return None

    def _validate_recipe(self, recipe_dict: Dict[str, Any]) -> bool:
        """Validate that a recipe dictionary has all required fields"""
        required_fields = ["name", "ingredients", "instructions"]
        if not all(
            field in recipe_dict and recipe_dict[field] for field in required_fields
        ):
            return False
        if not isinstance(recipe_dict["ingredients"], list):
            return False
        return True

    def _fix_recipe(self, recipe_dict: Dict[str, Any]) -> Dict[str, Any] | None:
        """
        Fix common issues in recipe dictionaries returned by Claude.
        """
        if not isinstance(recipe_dict, dict):
            return None

        # Ensure required fields exist
        recipe_dict.setdefault("name", "Untitled Recipe")
        recipe_dict.setdefault("description", "")
        recipe_dict.setdefault("ingredients", [])
        recipe_dict.setdefault("instructions", [])

        # Fix ingredient format
        ingredients = recipe_dict.get("ingredients", [])
        fixed_ingredients = []
        for ing in ingredients:
            if isinstance(ing, dict):
                # Ensure required ingredient fields
                ing.setdefault("name", "unknown ingredient")
                ing.setdefault("quantity", 1)
                ing.setdefault("unit", "")
                fixed_ingredients.append(ing)
            elif isinstance(ing, str):
                # Convert string to ingredient dict
                fixed_ingredients.append({"name": ing, "quantity": 1, "unit": ""})

        recipe_dict["ingredients"] = fixed_ingredients

        # Ensure instructions is a list
        instructions = recipe_dict.get("instructions", [])
        if isinstance(instructions, str):
            # Split string instructions into list
            recipe_dict["instructions"] = [
                step.strip() for step in instructions.split("\n") if step.strip()
            ]
        elif not isinstance(instructions, list):
            recipe_dict["instructions"] = ["Follow recipe as directed"]

        # Set default values for optional fields
        recipe_dict.setdefault("prep_time", 0)
        recipe_dict.setdefault("cook_time", 0)
        recipe_dict.setdefault("servings", 4)
        recipe_dict.setdefault("difficulty", "Medium")
        recipe_dict.setdefault("cuisine", "")
        recipe_dict.setdefault("nutrition", {"calories": 0})

        # Ensure numeric fields are actually numeric
        numeric_fields = ["prep_time", "cook_time", "servings"]
        for field in numeric_fields:
            try:
                recipe_dict[field] = int(recipe_dict.get(field, 0))
            except (ValueError, TypeError):
                recipe_dict[field] = 0

        return recipe_dict

    def _get_fallback_recipe(
        self, meal_type: str, servings: int = 4
    ) -> RecipeSuggestion:
        """
        Generate a simple fallback recipe when AI generation fails.
        """
        fallback_recipes = {
            "breakfast": {
                "name": "Simple Scrambled Eggs",
                "description": "Classic breakfast with eggs and toast",
                "cuisine": "American",
                "ingredients": [
                    {"name": "eggs", "quantity": 2, "unit": "large"},
                    {"name": "butter", "quantity": 1, "unit": "tbsp"},
                    {"name": "salt", "quantity": 1, "unit": "pinch"},
                    {"name": "black pepper", "quantity": 1, "unit": "pinch"},
                ],
                "instructions": [
                    "Beat eggs in a bowl with salt and pepper",
                    "Heat butter in a non-stick pan over medium-low heat",
                    "Add eggs and gently scramble until set",
                    "Serve immediately",
                ],
                "prep_time": 5,
                "cook_time": 5,
                "difficulty": "Easy",
            },
            "lunch": {
                "name": "Classic Grilled Cheese",
                "description": "Comfort food sandwich with melted cheese",
                "cuisine": "American",
                "ingredients": [
                    {"name": "bread", "quantity": 2, "unit": "slices"},
                    {"name": "cheddar cheese", "quantity": 2, "unit": "slices"},
                    {"name": "butter", "quantity": 1, "unit": "tbsp"},
                ],
                "instructions": [
                    "Butter one side of each bread slice",
                    "Place cheese between unbuttered sides",
                    "Cook in skillet until golden and cheese melts",
                    "Flip once and cook other side",
                ],
                "prep_time": 5,
                "cook_time": 8,
                "difficulty": "Easy",
            },
            "dinner": {
                "name": "Simple Pasta with Marinara",
                "description": "Quick and satisfying pasta dinner",
                "cuisine": "Italian",
                "ingredients": [
                    {"name": "pasta", "quantity": 8, "unit": "oz"},
                    {"name": "marinara sauce", "quantity": 1, "unit": "cup"},
                    {"name": "parmesan cheese", "quantity": 2, "unit": "tbsp"},
                    {"name": "olive oil", "quantity": 1, "unit": "tbsp"},
                ],
                "instructions": [
                    "Cook pasta according to package directions",
                    "Heat marinara sauce in a pan",
                    "Drain pasta and toss with sauce",
                    "Serve with parmesan cheese",
                ],
                "prep_time": 5,
                "cook_time": 15,
                "difficulty": "Easy",
            },
        }

        fallback = fallback_recipes.get(meal_type, fallback_recipes["dinner"]).copy()
        fallback["servings"] = servings
        fallback["nutrition"] = {"calories": 300}

        return RecipeSuggestion(**fallback)

    def _build_web_search_tools(self, max_uses: int = 3) -> List[Dict[str, Any]]:
        """Build web search tool configuration for recipe inspiration"""
        return [
            {
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": max_uses,
                "allowed_domains": RECIPE_WEB_SEARCH_ALLOWED_DOMAINS,
            }
        ]

    def _stream_claude_response(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 8000,
        temperature: float = 1.0,
        thinking_budget: int = 3000,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Iterator[str]:
        """
        Stream response from Claude with unified error handling and response processing.
        """
        try:
            stream_args = {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system_prompt,
                "thinking": {"type": "enabled", "budget_tokens": thinking_budget},
                "messages": [{"role": "user", "content": user_prompt}],
            }

            if tools:
                stream_args["tools"] = tools

            with self.client.messages.stream(**stream_args) as stream:
                accumulated_text = ""
                accumulated_thinking = ""
                current_content_type: str | None = None
                content_received = False

                try:
                    for chunk in stream:
                        content_received = True

                        if chunk.type == "content_block_start":
                            if hasattr(chunk, "content_block") and hasattr(
                                chunk.content_block, "type"
                            ):
                                current_content_type = chunk.content_block.type
                                if chunk.content_block.type == "thinking":
                                    yield f"data: {json.dumps({'type': 'thinking_start', 'message': 'Thinking through your request...'})}\n\n"

                        elif chunk.type == "content_block_delta":
                            if hasattr(chunk.delta, "text"):
                                text_chunk = chunk.delta.text
                                accumulated_text += text_chunk

                                if current_content_type == "thinking":
                                    # Check if we're still in thinking or moved to completion
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
                                    yield f"data: {json.dumps({'type': 'content', 'chunk': text_chunk})}\n\n"

                        elif chunk.type == "content_block_stop":
                            if current_content_type == "thinking":
                                yield f"data: {json.dumps({'type': 'thinking_stop', 'message': 'Planning complete'})}\n\n"
                            current_content_type = None

                except Exception as stream_error:
                    logger.error(f"Streaming error: {stream_error}")
                    if not content_received:
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Connection error: {stream_error}'})}\n\n"
                        return

                if not content_received or not accumulated_text.strip():
                    logger.warning("No content received from Claude")
                    yield f"data: {json.dumps({'type': 'error', 'message': 'No response received from AI. This may be due to rate limiting or connection issues.'})}\n\n"
                    return

                logger.info(
                    f"Response generated, content length: {len(accumulated_text)}, thinking length: {len(accumulated_thinking)}"
                )

                # Return the final accumulated text for parsing
                yield accumulated_text

        except Exception as e:
            logger.error(f"Error in Claude streaming: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': f'Error generating response: {e}'})}\n\n"
