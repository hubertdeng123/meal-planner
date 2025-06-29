"""
Optimized meal planning agent that uses vector search and historical data to reduce API calls
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import logging
from app.agents.meal_planning_agent import MealPlanningAgent
from app.core.vector_store import RecipeVectorStore, HistoricalDataSummarizer

logger = logging.getLogger(__name__)


class OptimizedMealPlanningAgent(MealPlanningAgent):
    """
    Enhanced meal planning agent that:
    1. Searches vector database for similar recipes first
    2. Uses historical data to personalize recommendations
    3. Only calls Claude API when necessary
    """

    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.vector_store = RecipeVectorStore()
        self.summarizer = HistoricalDataSummarizer()

    async def generate_recipes(
        self,
        meal_type: str,
        servings: int,
        preferences: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        db=None,
    ) -> List[Dict[str, Any]]:
        """
        Generate recipes using vector search first, then fall back to Claude if needed
        """
        if not preferences:
            preferences = {}

        # Step 1: Get user history summary if user_id provided
        user_summary = {}
        if user_id and db:
            try:
                user_summary = await self.summarizer.summarize_user_history(user_id, db)
                logger.info(f"Retrieved user history summary for user {user_id}")
            except Exception as e:
                logger.error(f"Error getting user history: {e}")

        # Step 2: Build optimized search query
        search_query = self._build_search_query(meal_type, preferences, user_summary)

        # Step 3: Search vector database first
        try:
            similar_recipes = self.vector_store.search_similar_recipes(
                query=search_query,
                meal_type=meal_type,
                n_results=20,
                min_similarity=0.75,
            )

            # Rank recipes based on user preferences
            if similar_recipes:
                ranked_recipes = self._rank_recipes_by_preference(
                    similar_recipes, user_summary, preferences
                )

                # Adjust servings for matched recipes
                for recipe in ranked_recipes:
                    recipe["servings"] = servings

                # If we have enough good matches, return them
                if len(ranked_recipes) >= 3:
                    logger.info(
                        f"Found {len(ranked_recipes)} recipes from vector store"
                    )

                    # Track interaction for learning
                    if user_id:
                        for recipe in ranked_recipes[:3]:
                            self.vector_store.update_user_preferences(
                                user_id,
                                {
                                    "type": "recipe_suggested",
                                    "recipe": recipe,
                                    "source": "vector_search",
                                },
                            )

                    return ranked_recipes[:3]
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")

        # Step 4: Fall back to Claude API if necessary
        logger.info("Insufficient vector matches, using Claude API")

        # Create optimized prompt with user context
        self._create_optimized_prompt(meal_type, servings, preferences, user_summary)

        # Call parent method with optimized prompt
        recipes = await super().generate_recipes(meal_type, servings, preferences)

        # Step 5: Store generated recipes in vector database
        for recipe in recipes:
            try:
                recipe_id = f"{meal_type}_{datetime.utcnow().timestamp()}"
                self.vector_store.add_recipe(recipe, recipe_id)
            except Exception as e:
                logger.error(f"Error adding recipe to vector store: {e}")

        # Track interaction
        if user_id:
            for recipe in recipes:
                self.vector_store.update_user_preferences(
                    user_id,
                    {
                        "type": "recipe_suggested",
                        "recipe": recipe,
                        "source": "claude_api",
                    },
                )

        return recipes

    def _build_search_query(
        self, meal_type: str, preferences: Dict[str, Any], user_summary: Dict[str, Any]
    ) -> str:
        """Build an optimized search query based on preferences and history"""
        query_parts = [f"{meal_type} recipe"]

        # Add user's historical preferences
        if user_summary.get("favorite_meal_types"):
            # Check if this meal type aligns with user's favorites
            if meal_type in user_summary["favorite_meal_types"]:
                query_parts.append("favorite")

        # Add cuisine preferences
        cuisines = preferences.get("cuisines", [])
        if not cuisines and user_summary.get("cuisine_distribution"):
            # Use historical preferences if not specified
            top_cuisines = sorted(
                user_summary["cuisine_distribution"].items(),
                key=lambda x: x[1],
                reverse=True,
            )[:2]
            cuisines = [c[0] for c in top_cuisines]

        if cuisines:
            query_parts.append(f"{' or '.join(cuisines)} cuisine")

        # Add dietary restrictions
        if preferences.get("dietary_restrictions"):
            query_parts.append(" ".join(preferences["dietary_restrictions"]))

        # Add ingredients
        if preferences.get("ingredients"):
            query_parts.append(f"with {', '.join(preferences['ingredients'])}")

        # Add complexity based on history
        complexity = user_summary.get("complexity_preference", "medium")
        query_parts.append(f"{complexity} difficulty")

        return " ".join(query_parts)

    def _rank_recipes_by_preference(
        self,
        recipes: List[Dict[str, Any]],
        user_summary: Dict[str, Any],
        current_preferences: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Rank recipes based on user preferences and history"""

        for recipe in recipes:
            score = recipe.get("similarity_score", 0.5)

            # Boost score for matching cuisine preferences
            if user_summary.get("cuisine_distribution"):
                cuisine = recipe.get("cuisine", "")
                if cuisine in user_summary["cuisine_distribution"]:
                    boost = min(0.2, user_summary["cuisine_distribution"][cuisine] / 10)
                    score += boost

            # Boost for matching dietary preferences
            if current_preferences.get("dietary_restrictions"):
                recipe_tags = set(recipe.get("tags", []))
                diet_restrictions = set(current_preferences["dietary_restrictions"])
                if diet_restrictions.intersection(recipe_tags):
                    score += 0.15

            # Boost for favorite ingredients
            if user_summary.get("ingredient_frequency"):
                recipe_ingredients = {
                    ing.get("name", "").lower() for ing in recipe.get("ingredients", [])
                }
                favorite_ingredients = set(user_summary["ingredient_frequency"].keys())
                matching_ingredients = recipe_ingredients.intersection(
                    favorite_ingredients
                )
                if matching_ingredients:
                    score += min(0.1, len(matching_ingredients) * 0.02)

            # Penalize recently used recipes
            if recipe.get("id") in user_summary.get("reused_recipes", []):
                score -= 0.3

            recipe["final_score"] = min(score, 1.0)

        # Sort by final score
        return sorted(recipes, key=lambda x: x["final_score"], reverse=True)

    def _create_optimized_prompt(
        self,
        meal_type: str,
        servings: int,
        preferences: Dict[str, Any],
        user_summary: Dict[str, Any],
    ) -> str:
        """Create an optimized prompt that includes user context to reduce tokens"""

        # Build user context
        context_parts = []

        if user_summary.get("favorite_meal_types"):
            top_meal = max(
                user_summary["favorite_meal_types"].items(), key=lambda x: x[1]
            )[0]
            context_parts.append(f"User prefers {top_meal} meals")

        if user_summary.get("cuisine_distribution"):
            top_cuisines = sorted(
                user_summary["cuisine_distribution"].items(),
                key=lambda x: x[1],
                reverse=True,
            )[:3]
            if top_cuisines:
                cuisine_names = [c[0] for c in top_cuisines]
                context_parts.append(f"Favorite cuisines: {', '.join(cuisine_names)}")

        if user_summary.get("dietary_consistency"):
            context_parts.append(
                f"Dietary pattern: {', '.join(user_summary['dietary_consistency'])}"
            )

        context = ". ".join(context_parts) if context_parts else ""

        # Create concise prompt
        prompt = f"""Generate 3 {meal_type} recipes for {servings} servings.

User preferences: {json.dumps(preferences)}
{f"User context: {context}" if context else ""}

Focus on variety and user preferences. Return ONLY valid JSON array."""

        return prompt

    async def generate_weekly_meal_plan(
        self,
        preferences: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        db=None,
    ) -> Dict[str, Any]:
        """
        Generate a weekly meal plan using vector search optimization
        """
        if user_id and db:
            try:
                await self.summarizer.summarize_user_history(user_id, db)
            except Exception as e:
                logger.error(f"Error getting user history: {e}")

        # Use parent method but with optimized recipe generation
        return await super().generate_weekly_meal_plan(preferences)

    def track_recipe_selection(self, user_id: int, recipe: Dict[str, Any]):
        """Track when a user selects a recipe for learning"""
        try:
            self.vector_store.update_user_preferences(
                user_id,
                {
                    "type": "recipe_selected",
                    "recipe": recipe,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )
        except Exception as e:
            logger.error(f"Error tracking recipe selection: {e}")


# Usage example:
# agent = OptimizedMealPlanningAgent()
#
# # This will use cache on repeated calls
# recipes = await agent.generate_meal_suggestions(
#     meal_type="dinner",
#     servings=4,
#     difficulty="easy"
# )
#
# # This generates entire week in one call
# weekly_plan = await agent.generate_weekly_meal_plan(
#     cooking_days=["Monday", "Wednesday", "Friday"],
#     meal_types=["dinner"],
#     servings=4
# )
