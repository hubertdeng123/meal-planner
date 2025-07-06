"""
PostgreSQL + pgvector integration for semantic recipe search and user preference learning
"""

import numpy as np
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_, desc, func
from sentence_transformers import SentenceTransformer
import logging
from app.db.database import get_db
from app.models.recipe import Recipe, RecipeFeedback
from app.models.meal_plan import MealPlan, MealPlanItem

logger = logging.getLogger(__name__)


class RecipeVectorStore:
    """PostgreSQL + pgvector store for semantic recipe search"""

    def __init__(self, db: Session = None):
        # Initialize sentence transformer for embeddings
        self.encoder = SentenceTransformer("all-MiniLM-L6-v2")
        self.db = db or next(get_db())

        # Check if embedding column exists (for PostgreSQL vs SQLite compatibility)
        self.has_embedding_support = (
            hasattr(Recipe, "embedding") and Recipe.embedding is not None
        )

    def create_recipe_embedding_text(self, recipe: Dict[str, str | list | int]) -> str:
        """Create text representation of recipe for embedding"""
        # Combine relevant fields for semantic search
        text_parts = [
            f"Recipe: {recipe.get('name', '')}",
            f"Cuisine: {recipe.get('cuisine', '')}",
            f"Description: {recipe.get('description', '')}",
            f"Difficulty: {recipe.get('difficulty', '')}",
            f"Dietary: {' '.join(recipe.get('tags', []))}",
        ]

        # Add ingredients
        ingredients = recipe.get("ingredients", [])
        if ingredients:
            ingredient_names = [
                ing.get("name", "") for ing in ingredients if ing.get("name")
            ]
            text_parts.append(f"Ingredients: {', '.join(ingredient_names)}")

        # Add cooking method hints from instructions
        instructions = recipe.get("instructions", [])
        if instructions:
            # Take first few instructions to capture cooking method
            method_text = (
                " ".join(instructions[:2])
                if isinstance(instructions, list)
                else str(instructions)
            )
            text_parts.append(f"Method: {method_text[:200]}")  # Limit length

        # Add nutrition info if available
        if recipe.get("nutrition"):
            nutrition = recipe["nutrition"]
            text_parts.append(
                f"Nutrition: {nutrition.get('calories', 0)} calories, "
                f"{nutrition.get('protein_g', 0)}g protein"
            )

        return " ".join(text_parts)

    def add_recipe_embedding(self, recipe_id: int) -> bool:
        """Generate and store embedding for an existing recipe"""
        if not self.has_embedding_support:
            logger.warning("Embedding not supported in current database configuration")
            return False

        try:
            # Get recipe from database
            recipe = self.db.query(Recipe).filter(Recipe.id == recipe_id).first()
            if not recipe:
                logger.error(f"Recipe {recipe_id} not found")
                return False

            # Convert to dict for embedding generation
            recipe_dict = {
                "name": recipe.name,
                "description": recipe.description,
                "cuisine": recipe.cuisine,
                "difficulty": recipe.difficulty,
                "tags": recipe.get_tags(),
                "ingredients": recipe.ingredients or [],
                "instructions": recipe.instructions or [],
                "nutrition": {
                    "calories": recipe.calories,
                    "protein_g": recipe.protein_g,
                    "carbs_g": recipe.carbs_g,
                    "fat_g": recipe.fat_g,
                },
            }

            # Create embedding text and generate embedding
            embedding_text = self.create_recipe_embedding_text(recipe_dict)
            embedding = self.encoder.encode(embedding_text).tolist()

            # Update recipe with embedding
            recipe.embedding = embedding
            self.db.commit()

            logger.info(f"Added embedding for recipe: {recipe.name}")
            return True

        except Exception as e:
            logger.error(f"Error adding embedding for recipe {recipe_id}: {e}")
            self.db.rollback()
            return False

    def search_similar_recipes(
        self,
        query: str,
        user_id: Optional[int] = None,
        meal_type: Optional[str] = None,
        cuisine: Optional[str] = None,
        dietary_restrictions: Optional[List[str]] = None,
        max_prep_time: Optional[int] = None,
        n_results: int = 10,
        min_similarity: float = 0.7,
    ) -> List[Dict[str, str | int]]:
        """Search for similar recipes using semantic search with filters"""
        if not self.has_embedding_support:
            # Fallback to basic search when embeddings not available
            return self._fallback_search(
                query, cuisine, dietary_restrictions, max_prep_time, n_results
            )

        try:
            # Generate query embedding
            query_embedding = self.encoder.encode(query).tolist()

            # Build base query
            query_obj = self.db.query(Recipe).filter(Recipe.embedding.isnot(None))

            # Apply filters
            if cuisine:
                query_obj = query_obj.filter(Recipe.cuisine.ilike(f"%{cuisine}%"))

            if max_prep_time:
                query_obj = query_obj.filter(
                    or_(
                        Recipe.prep_time_minutes.is_(None),
                        Recipe.prep_time_minutes <= max_prep_time,
                    )
                )

            if dietary_restrictions:
                # Check if recipe tags contain any of the dietary restrictions
                for restriction in dietary_restrictions:
                    query_obj = query_obj.filter(Recipe.tags.any(restriction))

            # Calculate cosine similarity and apply threshold
            # Using pgvector's cosine distance operator <=>
            query_obj = query_obj.order_by(
                Recipe.embedding.cosine_distance(query_embedding)
            ).limit(n_results * 2)  # Get more to filter by similarity threshold

            results = query_obj.all()

            # Convert to dict format with similarity scores
            recipes = []
            for recipe in results:
                if recipe.embedding:
                    # Calculate similarity (1 - cosine_distance)
                    similarity = 1 - float(
                        self.db.execute(
                            text("SELECT :embedding <=> :recipe_embedding as distance"),
                            {
                                "embedding": str(query_embedding),
                                "recipe_embedding": str(recipe.embedding),
                            },
                        ).scalar()
                    )

                    if similarity >= min_similarity:
                        recipe_dict = {
                            "id": recipe.id,
                            "name": recipe.name,
                            "description": recipe.description,
                            "cuisine": recipe.cuisine,
                            "difficulty": recipe.difficulty,
                            "tags": recipe.get_tags(),
                            "ingredients": recipe.ingredients or [],
                            "instructions": recipe.instructions or [],
                            "prep_time": recipe.prep_time_minutes,
                            "cook_time": recipe.cook_time_minutes,
                            "servings": recipe.servings,
                            "nutrition": {
                                "calories": recipe.calories,
                                "protein_g": recipe.protein_g,
                                "carbs_g": recipe.carbs_g,
                                "fat_g": recipe.fat_g,
                            },
                            "similarity_score": similarity,
                            "created_at": recipe.created_at.isoformat()
                            if recipe.created_at
                            else None,
                        }
                        recipes.append(recipe_dict)

            # Sort by similarity and return top results
            recipes.sort(key=lambda x: x["similarity_score"], reverse=True)
            return recipes[:n_results]

        except Exception as e:
            logger.error(f"Error searching recipes: {e}")
            return self._fallback_search(
                query, cuisine, dietary_restrictions, max_prep_time, n_results
            )

    def _fallback_search(
        self,
        query: str,
        cuisine: Optional[str] = None,
        dietary_restrictions: Optional[List[str]] = None,
        max_prep_time: Optional[int] = None,
        n_results: int = 10,
    ) -> List[Dict[str, str | int]]:
        """Fallback search using basic text matching when embeddings not available"""
        try:
            # Build query with text search
            query_obj = self.db.query(Recipe)

            # Simple text search in name and description
            if query:
                query_obj = query_obj.filter(
                    or_(
                        Recipe.name.ilike(f"%{query}%"),
                        Recipe.description.ilike(f"%{query}%"),
                    )
                )

            # Apply filters
            if cuisine:
                query_obj = query_obj.filter(Recipe.cuisine.ilike(f"%{cuisine}%"))

            if max_prep_time:
                query_obj = query_obj.filter(
                    or_(
                        Recipe.prep_time_minutes.is_(None),
                        Recipe.prep_time_minutes <= max_prep_time,
                    )
                )

            # Order by relevance (name matches first, then description)
            query_obj = query_obj.order_by(
                Recipe.name.ilike(f"%{query}%").desc(), Recipe.created_at.desc()
            ).limit(n_results)

            results = query_obj.all()

            # Convert to dict format
            recipes = []
            for recipe in results:
                recipe_dict = {
                    "id": recipe.id,
                    "name": recipe.name,
                    "description": recipe.description,
                    "cuisine": recipe.cuisine,
                    "difficulty": recipe.difficulty,
                    "tags": recipe.get_tags(),
                    "ingredients": recipe.ingredients or [],
                    "instructions": recipe.instructions or [],
                    "prep_time": recipe.prep_time_minutes,
                    "cook_time": recipe.cook_time_minutes,
                    "servings": recipe.servings,
                    "nutrition": {
                        "calories": recipe.calories,
                        "protein_g": recipe.protein_g,
                        "carbs_g": recipe.carbs_g,
                        "fat_g": recipe.fat_g,
                    },
                    "similarity_score": 0.5,  # Default score for fallback
                    "created_at": recipe.created_at.isoformat()
                    if recipe.created_at
                    else None,
                }
                recipes.append(recipe_dict)

            return recipes

        except Exception as e:
            logger.error(f"Error in fallback search: {e}")
            return []

    def build_search_query_from_preferences(
        self, meal_type: str, preferences: Dict[str, str | int]
    ) -> str:
        """Build semantic search query from user preferences"""
        query_parts = [f"{meal_type} recipe"]

        if preferences.get("cuisines"):
            query_parts.append(f"{' or '.join(preferences['cuisines'])} cuisine")

        if preferences.get("dietary_restrictions"):
            query_parts.append(f"{' '.join(preferences['dietary_restrictions'])}")

        if preferences.get("ingredients"):
            query_parts.append(f"with {', '.join(preferences['ingredients'])}")

        if preferences.get("difficulty"):
            query_parts.append(f"{preferences['difficulty']} difficulty")

        return " ".join(query_parts)

    def get_user_preference_vector(self, user_id: int) -> Optional[np.ndarray]:
        """Generate preference vector based on user's highly-rated recipes"""
        if not self.has_embedding_support:
            return None

        try:
            # Get user's top-rated recipes (4+ stars)
            high_rated_recipes = (
                self.db.query(Recipe)
                .join(RecipeFeedback)
                .filter(
                    and_(
                        RecipeFeedback.user_id == user_id,
                        RecipeFeedback.rating >= 4,
                        Recipe.embedding.isnot(None),
                    )
                )
                .limit(20)
                .all()
            )

            if not high_rated_recipes:
                return None

            # Average the embeddings of highly-rated recipes
            embeddings = [
                recipe.embedding for recipe in high_rated_recipes if recipe.embedding
            ]
            if not embeddings:
                return None

            # Convert to numpy arrays and average
            embedding_arrays = [np.array(emb) for emb in embeddings]
            preference_vector = np.mean(embedding_arrays, axis=0)

            return preference_vector

        except Exception as e:
            logger.error(f"Error calculating user preference vector: {e}")
            return None

    def get_personalized_recommendations(
        self,
        user_id: int,
        meal_type: Optional[str] = None,
        n_results: int = 10,
        exclude_recent_days: int = 7,
    ) -> List[Dict[str, str | int]]:
        """Get personalized recipe recommendations based on user preferences"""
        if not self.has_embedding_support:
            # Fallback to popular recipes
            return self.get_popular_recipes(meal_type, n_results)

        try:
            # Get user preference vector
            preference_vector = self.get_user_preference_vector(user_id)
            if preference_vector is None:
                # Fall back to popular recipes if no preferences
                return self.get_popular_recipes(meal_type, n_results)

            # Get recently used recipes to exclude
            recent_cutoff = datetime.utcnow() - timedelta(days=exclude_recent_days)
            recent_recipe_ids = (
                self.db.query(Recipe.id)
                .join(MealPlanItem)
                .join(MealPlan)
                .filter(
                    and_(
                        MealPlan.user_id == user_id,
                        MealPlan.created_at >= recent_cutoff,
                    )
                )
                .subquery()
            )

            # Build query excluding recent recipes
            query_obj = self.db.query(Recipe).filter(
                and_(Recipe.embedding.isnot(None), ~Recipe.id.in_(recent_recipe_ids))
            )

            # Apply meal type filter if specified
            if meal_type:
                # Could add meal_type field to Recipe model, or infer from tags
                pass

            # Order by similarity to user preference vector
            preference_list = preference_vector.tolist()
            query_obj = query_obj.order_by(
                Recipe.embedding.cosine_distance(preference_list)
            ).limit(n_results)

            results = query_obj.all()

            # Convert to dict format
            recommendations = []
            for recipe in results:
                if recipe.embedding:
                    # Calculate similarity to user preferences
                    similarity = 1 - float(
                        self.db.execute(
                            text(
                                "SELECT :pref_vector <=> :recipe_embedding as distance"
                            ),
                            {
                                "pref_vector": str(preference_list),
                                "recipe_embedding": str(recipe.embedding),
                            },
                        ).scalar()
                    )

                    recipe_dict = {
                        "id": recipe.id,
                        "name": recipe.name,
                        "description": recipe.description,
                        "cuisine": recipe.cuisine,
                        "difficulty": recipe.difficulty,
                        "tags": recipe.get_tags(),
                        "ingredients": recipe.ingredients or [],
                        "instructions": recipe.instructions or [],
                        "prep_time": recipe.prep_time_minutes,
                        "cook_time": recipe.cook_time_minutes,
                        "servings": recipe.servings,
                        "nutrition": {
                            "calories": recipe.calories,
                            "protein_g": recipe.protein_g,
                            "carbs_g": recipe.carbs_g,
                            "fat_g": recipe.fat_g,
                        },
                        "preference_score": similarity,
                        "created_at": recipe.created_at.isoformat()
                        if recipe.created_at
                        else None,
                    }
                    recommendations.append(recipe_dict)

            return recommendations

        except Exception as e:
            logger.error(f"Error getting personalized recommendations: {e}")
            return self.get_popular_recipes(meal_type, n_results)

    def get_popular_recipes(
        self, meal_type: Optional[str] = None, n_results: int = 10
    ) -> List[Dict[str, str | int]]:
        """Get popular recipes based on ratings and usage"""
        try:
            # Query recipes with their average ratings
            query_obj = self.db.query(
                Recipe,
                func.avg(RecipeFeedback.rating).label("avg_rating"),
                func.count(RecipeFeedback.id).label("rating_count"),
            ).outerjoin(RecipeFeedback)

            # Filter by embedding availability if supported
            if self.has_embedding_support:
                query_obj = query_obj.filter(Recipe.embedding.isnot(None))

            query_obj = query_obj.group_by(Recipe.id)

            # Order by average rating and number of ratings
            query_obj = query_obj.order_by(
                desc("avg_rating"), desc("rating_count"), desc(Recipe.created_at)
            ).limit(n_results)

            results = query_obj.all()

            # Convert to dict format
            popular_recipes = []
            for recipe, avg_rating, rating_count in results:
                recipe_dict = {
                    "id": recipe.id,
                    "name": recipe.name,
                    "description": recipe.description,
                    "cuisine": recipe.cuisine,
                    "difficulty": recipe.difficulty,
                    "tags": recipe.get_tags(),
                    "ingredients": recipe.ingredients or [],
                    "instructions": recipe.instructions or [],
                    "prep_time": recipe.prep_time_minutes,
                    "cook_time": recipe.cook_time_minutes,
                    "servings": recipe.servings,
                    "nutrition": {
                        "calories": recipe.calories,
                        "protein_g": recipe.protein_g,
                        "carbs_g": recipe.carbs_g,
                        "fat_g": recipe.fat_g,
                    },
                    "avg_rating": float(avg_rating) if avg_rating else None,
                    "rating_count": rating_count or 0,
                    "created_at": recipe.created_at.isoformat()
                    if recipe.created_at
                    else None,
                }
                popular_recipes.append(recipe_dict)

            return popular_recipes

        except Exception as e:
            logger.error(f"Error getting popular recipes: {e}")
            return []


class HistoricalDataSummarizer:
    """Summarize historical meal planning data to reduce API calls"""

    def __init__(self, db: Session = None):
        self.db = db or next(get_db())

    async def summarize_user_history(self, user_id: int) -> Dict[str, str | list]:
        """Generate a comprehensive summary of user's meal planning history"""

        # Get last 30 days of meal plans
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Query meal plans and selected recipes
        meal_plans = (
            self.db.query(MealPlan)
            .filter(MealPlan.user_id == user_id, MealPlan.created_at >= thirty_days_ago)
            .all()
        )

        # Analyze patterns
        summary = {
            "total_meal_plans": len(meal_plans),
            "favorite_cuisines": {},
            "dietary_patterns": {},
            "complexity_preference": "medium",
            "avg_prep_time": None,
            "reused_recipes": [],
        }

        # Get user's recipe feedback for preferences
        feedbacks = (
            self.db.query(RecipeFeedback)
            .join(Recipe)
            .filter(
                RecipeFeedback.user_id == user_id,
                RecipeFeedback.created_at >= thirty_days_ago,
            )
            .all()
        )

        if feedbacks:
            # Analyze cuisine preferences from highly-rated recipes
            cuisine_ratings = {}
            total_prep_time = 0
            prep_time_count = 0

            for feedback in feedbacks:
                if feedback.rating >= 4:  # High rating
                    cuisine = feedback.recipe.cuisine
                    if cuisine:
                        cuisine_ratings[cuisine] = cuisine_ratings.get(cuisine, [])
                        cuisine_ratings[cuisine].append(feedback.rating)

                # Track prep time preferences
                if feedback.recipe.prep_time_minutes:
                    total_prep_time += feedback.recipe.prep_time_minutes
                    prep_time_count += 1

            # Calculate average ratings per cuisine
            for cuisine, ratings in cuisine_ratings.items():
                summary["favorite_cuisines"][cuisine] = {
                    "avg_rating": sum(ratings) / len(ratings),
                    "count": len(ratings),
                }

            # Calculate average preferred prep time
            if prep_time_count > 0:
                summary["avg_prep_time"] = total_prep_time / prep_time_count

        # Find frequently reused recipes
        recipe_usage = {}
        for plan in meal_plans:
            for item in plan.items:
                if item.recipe_id:
                    recipe_usage[item.recipe_id] = (
                        recipe_usage.get(item.recipe_id, 0) + 1
                    )

        summary["reused_recipes"] = [
            recipe_id for recipe_id, count in recipe_usage.items() if count > 1
        ]

        return summary

    def create_preference_context(self, user_summary: Dict[str, str | list]) -> str:
        """Create a concise context string for API calls"""
        context_parts = []

        # Add cuisine preferences
        if user_summary.get("favorite_cuisines"):
            top_cuisines = sorted(
                user_summary["favorite_cuisines"].items(),
                key=lambda x: (x[1]["avg_rating"], x[1]["count"]),
                reverse=True,
            )[:3]
            if top_cuisines:
                cuisine_names = [c[0] for c in top_cuisines]
                context_parts.append(f"Prefers {', '.join(cuisine_names)} cuisines")

        # Add time preferences
        if user_summary.get("avg_prep_time"):
            avg_time = user_summary["avg_prep_time"]
            if avg_time <= 20:
                context_parts.append("Prefers quick recipes (under 20 min prep)")
            elif avg_time <= 45:
                context_parts.append("Prefers moderate prep time recipes")
            else:
                context_parts.append("Comfortable with longer prep time recipes")

        # Add complexity preference
        context_parts.append(
            f"Complexity preference: {user_summary.get('complexity_preference', 'medium')}"
        )

        return ". ".join(context_parts)


class OptimizedMealPlanningService:
    """Service that uses pgvector search before falling back to Claude"""

    def __init__(self, db: Session = None):
        self.db = db or next(get_db())
        self.vector_store = RecipeVectorStore(self.db)
        self.summarizer = HistoricalDataSummarizer(self.db)

    async def generate_meal_suggestions(
        self,
        user_id: int,
        meal_type: str,
        preferences: Dict[str, str | int | float | dict | list],
        n_suggestions: int = 3,
    ) -> List[Dict[str, str | int]]:
        """Generate meal suggestions using vector search first"""

        # Step 1: Get user history summary
        await self.summarizer.summarize_user_history(user_id)

        # Step 2: Build search query
        search_query = self.vector_store.build_search_query_from_preferences(
            meal_type, preferences
        )

        # Step 3: Search vector database first
        similar_recipes = self.vector_store.search_similar_recipes(
            query=search_query,
            user_id=user_id,
            cuisine=preferences.get("cuisine"),
            dietary_restrictions=preferences.get("dietary_restrictions"),
            max_prep_time=preferences.get("max_prep_time"),
            n_results=n_suggestions * 2,  # Get more to have options
            min_similarity=0.7,
        )

        # Step 4: If not enough results, try personalized recommendations
        if len(similar_recipes) < n_suggestions:
            personalized = self.vector_store.get_personalized_recommendations(
                user_id=user_id, meal_type=meal_type, n_results=n_suggestions
            )

            # Combine and deduplicate
            existing_ids = {r["id"] for r in similar_recipes}
            for recipe in personalized:
                if (
                    recipe["id"] not in existing_ids
                    and len(similar_recipes) < n_suggestions
                ):
                    similar_recipes.append(recipe)

        # Step 5: If still not enough, fall back to popular recipes
        if len(similar_recipes) < n_suggestions:
            popular = self.vector_store.get_popular_recipes(
                meal_type=meal_type, n_results=n_suggestions
            )

            existing_ids = {r["id"] for r in similar_recipes}
            for recipe in popular:
                if (
                    recipe["id"] not in existing_ids
                    and len(similar_recipes) < n_suggestions
                ):
                    similar_recipes.append(recipe)

        # Return top results
        return similar_recipes[:n_suggestions]
