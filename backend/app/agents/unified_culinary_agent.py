"""
Unified base agent for all recipe generation and meal planning operations.
Consolidates shared functionality and provides comprehensive user preferences integration.
"""

from __future__ import annotations
import json
import logging
import re
from collections.abc import Iterator
from pydantic import BaseModel
from together import Together
from app.core.config import settings
from app.models import User, RecipeFeedback
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class UnifiedCulinaryAgent:
    """
    Base agent for all culinary AI operations using Together API (Llama 4 Maverick).
    Provides shared functionality and comprehensive user preferences integration.
    """

    def __init__(self):
        self._client: Together | None = None

    @property
    def client(self) -> Together:
        """Lazy initialization of Together client"""
        if self._client is None:
            self._client = Together(api_key=settings.TOGETHER_API_KEY)
        return self._client

    def _get_response_format(self, schema: type[BaseModel]) -> dict:
        """Build response_format parameter for structured JSON output"""
        return {
            "type": "json_schema",
            "schema": schema.model_json_schema(),
        }

    def _build_enhanced_preferences_prompt(
        self, user_preferences: dict[str, object]
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
        Extract JSON from LLM response text.
        With structured output, this should always return valid JSON.
        Keep for backward compatibility and as safety net.
        """
        if not text or not text.strip():
            return None

        # Remove any markdown code blocks (shouldn't exist with structured output)
        text = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"```\s*", "", text)

        # With structured output, the entire response should be valid JSON
        try:
            # Validate it's parseable
            json.loads(text.strip())
            return text.strip()
        except json.JSONDecodeError as e:
            logger.error(f"JSON extraction failed despite structured output: {e}")
            return None

    def _validate_recipe(self, recipe_dict: dict[str, object]) -> bool:
        """
        Minimal validation as safety net.
        With structured output, this should always pass.
        """
        required_fields = ["name", "ingredients", "instructions"]
        if not all(
            field in recipe_dict and recipe_dict[field] for field in required_fields
        ):
            logger.warning("Recipe missing required fields despite structured output")
            return False
        if not isinstance(recipe_dict["ingredients"], list):
            logger.warning("Ingredients is not a list despite structured output")
            return False
        return True

    def _stream_together_response(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[BaseModel],
        max_tokens: int = 8000,
        temperature: float = 1.0,
    ) -> Iterator[str]:
        """
        Stream response from Together API with thinking then JSON.

        Args:
            system_prompt: System prompt for the LLM
            user_prompt: User prompt for the LLM
            response_schema: Pydantic model defining the expected JSON structure
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
        """
        try:
            # Use structured output for guaranteed valid JSON
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]

            # Stream from Together API WITH structured output (guarantees valid JSON)
            stream = self.client.chat.completions.create(
                model=settings.TOGETHER_MODEL,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=self._get_response_format(response_schema),
                stream=True,
            )

            # With structured output, entire response is JSON - no thinking text
            json_buffer = ""

            for chunk in stream:
                if not chunk.choices:
                    continue

                delta = chunk.choices[0].delta
                if not delta.content:
                    continue

                # Accumulate JSON (all content is JSON with structured output)
                json_buffer += delta.content

            # Return the complete JSON
            yield json_buffer

        except Exception as e:
            logger.error(f"Together API streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
