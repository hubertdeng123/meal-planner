"""
Tests for pgvector implementation and vector store functionality.
These tests verify that semantic search, user preferences, and embeddings work correctly.
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from app.core.vector_store import (
    RecipeVectorStore,
    HistoricalDataSummarizer,
    OptimizedMealPlanningService,
)
from app.models.recipe import Recipe, RecipeFeedback
from app.models.meal_plan import MealPlan, MealPlanItem
from datetime import datetime, timedelta, date


class TestRecipeVectorStore:
    """Test the RecipeVectorStore functionality"""

    def test_embedding_support_detection(self, db):
        """Test that embedding support is correctly detected"""
        vector_store = RecipeVectorStore(db)

        # Should detect no embedding support in SQLite tests
        assert not vector_store.has_embedding_support

    def test_create_recipe_embedding_text(self, db):
        """Test recipe text creation for embeddings"""
        vector_store = RecipeVectorStore(db)

        recipe_data = {
            "name": "Spaghetti Carbonara",
            "cuisine": "Italian",
            "description": "Classic Roman pasta dish",
            "difficulty": "Medium",
            "tags": ["pasta", "eggs", "cheese"],
            "ingredients": [
                {"name": "spaghetti", "quantity": 1, "unit": "lb"},
                {"name": "eggs", "quantity": 4, "unit": "large"},
                {"name": "parmesan", "quantity": 1, "unit": "cup"},
            ],
            "instructions": ["Boil pasta", "Mix eggs and cheese", "Combine"],
            "nutrition": {"calories": 450, "protein_g": 20},
        }

        embedding_text = vector_store.create_recipe_embedding_text(recipe_data)

        # Verify all important elements are included
        assert "Spaghetti Carbonara" in embedding_text
        assert "Italian" in embedding_text
        assert "pasta" in embedding_text
        assert "eggs" in embedding_text
        assert "cheese" in embedding_text
        assert "Medium" in embedding_text
        assert "450 calories" in embedding_text
        assert "20g protein" in embedding_text

    @patch("app.core.vector_store.SentenceTransformer")
    def test_add_recipe_embedding_no_support(self, mock_transformer, db, test_recipe):
        """Test embedding addition when no support available"""
        vector_store = RecipeVectorStore(db)

        # Should return False when no embedding support
        result = vector_store.add_recipe_embedding(test_recipe.id)
        assert not result

    def test_fallback_search(self, db, test_user):
        """Test fallback search functionality when embeddings unavailable"""
        vector_store = RecipeVectorStore(db)

        # Create test recipes
        recipe1 = Recipe(
            user_id=test_user.id,
            name="Italian Pasta",
            description="Delicious pasta dish",
            cuisine="Italian",
            instructions=["Cook pasta"],
            ingredients=[{"name": "pasta", "quantity": 1, "unit": "lb"}],
            tags=["pasta", "italian"],
        )
        recipe2 = Recipe(
            user_id=test_user.id,
            name="Mexican Tacos",
            description="Spicy tacos",
            cuisine="Mexican",
            instructions=["Make tacos"],
            ingredients=[{"name": "tortillas", "quantity": 8, "unit": "pieces"}],
            tags=["tacos", "mexican"],
        )
        db.add_all([recipe1, recipe2])
        db.commit()

        # Test search by name
        results = vector_store.search_similar_recipes(query="pasta", n_results=5)

        assert len(results) >= 1
        assert any("pasta" in r["name"].lower() for r in results)

        # Test search by cuisine
        results = vector_store.search_similar_recipes(
            query="italian", cuisine="Italian", n_results=5
        )

        assert len(results) >= 1
        assert any(r["cuisine"] == "Italian" for r in results)

    def test_get_popular_recipes(self, db, test_user):
        """Test popular recipes retrieval"""
        vector_store = RecipeVectorStore(db)

        # Create recipes with ratings
        recipe1 = Recipe(
            user_id=test_user.id,
            name="Popular Recipe",
            description="Very popular",
            instructions=["Cook"],
            ingredients=[{"name": "ingredient", "quantity": 1, "unit": "cup"}],
            tags=["popular"],
        )
        recipe2 = Recipe(
            user_id=test_user.id,
            name="Unpopular Recipe",
            description="Not so popular",
            instructions=["Cook"],
            ingredients=[{"name": "ingredient", "quantity": 1, "unit": "cup"}],
            tags=["unpopular"],
        )
        db.add_all([recipe1, recipe2])
        db.commit()

        # Add ratings
        feedback1 = RecipeFeedback(user_id=test_user.id, recipe_id=recipe1.id, rating=5)
        feedback2 = RecipeFeedback(user_id=test_user.id, recipe_id=recipe2.id, rating=2)
        db.add_all([feedback1, feedback2])
        db.commit()

        popular = vector_store.get_popular_recipes(n_results=5)

        assert len(popular) >= 2
        # Should be ordered by rating
        ratings = [r.get("avg_rating", 0) for r in popular if r.get("avg_rating")]
        assert ratings == sorted(ratings, reverse=True)

    def test_build_search_query_from_preferences(self, db):
        """Test search query building from user preferences"""
        vector_store = RecipeVectorStore(db)

        preferences = {
            "cuisines": ["Italian", "Mexican"],
            "dietary_restrictions": ["vegetarian", "gluten-free"],
            "ingredients": ["tomatoes", "cheese"],
            "difficulty": "Easy",
        }

        query = vector_store.build_search_query_from_preferences("dinner", preferences)

        assert "dinner recipe" in query
        assert "Italian or Mexican cuisine" in query
        assert "vegetarian gluten-free" in query
        assert "with tomatoes, cheese" in query
        assert "Easy difficulty" in query


class TestHistoricalDataSummarizer:
    """Test user history summarization"""

    @pytest.mark.asyncio
    async def test_summarize_user_history_empty(self, db, test_user):
        """Test summarization with no history"""
        summarizer = HistoricalDataSummarizer(db)

        summary = await summarizer.summarize_user_history(test_user.id)

        assert summary["total_meal_plans"] == 0
        assert summary["favorite_cuisines"] == {}
        assert summary["reused_recipes"] == []

    @pytest.mark.asyncio
    async def test_summarize_user_history_with_data(self, db, test_user):
        """Test summarization with actual user data"""
        summarizer = HistoricalDataSummarizer(db)

        # Create recipes
        recipe1 = Recipe(
            user_id=test_user.id,
            name="Italian Recipe",
            cuisine="Italian",
            prep_time_minutes=30,
            instructions=["Cook"],
            ingredients=[{"name": "pasta", "quantity": 1, "unit": "lb"}],
            tags=["italian"],
        )
        recipe2 = Recipe(
            user_id=test_user.id,
            name="Mexican Recipe",
            cuisine="Mexican",
            prep_time_minutes=45,
            instructions=["Cook"],
            ingredients=[{"name": "beans", "quantity": 1, "unit": "can"}],
            tags=["mexican"],
        )
        db.add_all([recipe1, recipe2])
        db.commit()

        # Create meal plans
        meal_plan = MealPlan(
            user_id=test_user.id,
            name="Test Plan",
            start_date=date.today() - timedelta(days=7),
            end_date=date.today(),
        )
        db.add(meal_plan)
        db.commit()

        # Create meal plan items
        item1 = MealPlanItem(
            meal_plan_id=meal_plan.id,
            recipe_id=recipe1.id,
            date=date.today() - timedelta(days=5),
            meal_type="dinner",
            servings=4,
        )
        item2 = MealPlanItem(
            meal_plan_id=meal_plan.id,
            recipe_id=recipe1.id,  # Reuse same recipe
            date=date.today() - timedelta(days=3),
            meal_type="dinner",
            servings=4,
        )
        db.add_all([item1, item2])
        db.commit()

        # Create feedback
        feedback1 = RecipeFeedback(
            user_id=test_user.id,
            recipe_id=recipe1.id,
            rating=5,
            created_at=datetime.utcnow() - timedelta(days=5),
        )
        feedback2 = RecipeFeedback(
            user_id=test_user.id,
            recipe_id=recipe2.id,
            rating=4,
            created_at=datetime.utcnow() - timedelta(days=3),
        )
        db.add_all([feedback1, feedback2])
        db.commit()

        summary = await summarizer.summarize_user_history(test_user.id)

        assert summary["total_meal_plans"] == 1
        assert "Italian" in summary["favorite_cuisines"]
        assert summary["favorite_cuisines"]["Italian"]["avg_rating"] == 5.0
        assert recipe1.id in summary["reused_recipes"]
        assert summary["avg_prep_time"] == 37.5  # Average of 30 and 45

    def test_create_preference_context(self, db):
        """Test preference context creation"""
        summarizer = HistoricalDataSummarizer(db)

        user_summary = {
            "favorite_cuisines": {
                "Italian": {"avg_rating": 4.8, "count": 5},
                "Mexican": {"avg_rating": 4.5, "count": 3},
            },
            "avg_prep_time": 25,
            "complexity_preference": "easy",
        }

        context = summarizer.create_preference_context(user_summary)

        assert "Italian, Mexican cuisines" in context
        assert "moderate prep time recipes" in context
        assert "easy" in context


class TestOptimizedMealPlanningService:
    """Test the complete optimized meal planning service"""

    @pytest.mark.asyncio
    async def test_generate_meal_suggestions_fallback(self, db, test_user):
        """Test meal suggestion generation using fallback methods"""
        service = OptimizedMealPlanningService(db)

        # Create test recipes
        recipe1 = Recipe(
            user_id=test_user.id,
            name="Italian Dinner",
            cuisine="Italian",
            description="Perfect dinner recipe",
            instructions=["Cook pasta"],
            ingredients=[{"name": "pasta", "quantity": 1, "unit": "lb"}],
            tags=["dinner", "italian"],
        )
        db.add(recipe1)
        db.commit()

        suggestions = await service.generate_meal_suggestions(
            user_id=test_user.id,
            meal_type="dinner",
            preferences={"cuisine": "Italian"},
            n_suggestions=3,
        )

        assert isinstance(suggestions, list)
        assert len(suggestions) >= 1
        assert all("name" in recipe for recipe in suggestions)
        assert all("similarity_score" in recipe for recipe in suggestions)


class TestVectorStoreIntegration:
    """Integration tests for the complete vector store system"""

    def test_recipe_tag_methods(self, db, test_user):
        """Test recipe tag helper methods"""
        recipe = Recipe(
            user_id=test_user.id,
            name="Test Recipe",
            instructions=["Cook"],
            ingredients=[{"name": "ingredient", "quantity": 1, "unit": "cup"}],
            tags=["tag1", "tag2"],
        )
        db.add(recipe)
        db.commit()

        # Test get_tags
        tags = recipe.get_tags()
        assert tags == ["tag1", "tag2"]

        # Test set_tags
        recipe.set_tags(["new_tag1", "new_tag2"])
        assert recipe.tags == ["new_tag1", "new_tag2"]

    def test_recipe_source_urls_methods(self, db, test_user):
        """Test recipe source URL helper methods"""
        recipe = Recipe(
            user_id=test_user.id,
            name="Test Recipe",
            instructions=["Cook"],
            ingredients=[{"name": "ingredient", "quantity": 1, "unit": "cup"}],
            source_urls=["http://example.com", "http://example2.com"],
        )
        db.add(recipe)
        db.commit()

        # Test get_source_urls
        urls = recipe.get_source_urls()
        assert urls == ["http://example.com", "http://example2.com"]

        # Test set_source_urls
        recipe.set_source_urls(["http://new1.com", "http://new2.com"])
        assert recipe.source_urls == ["http://new1.com", "http://new2.com"]


@pytest.fixture
def vector_store_with_mock_embeddings(db):
    """Create a vector store with mocked sentence transformer"""
    with patch("app.core.vector_store.SentenceTransformer") as mock_transformer:
        # Mock encoder to return deterministic embeddings
        mock_encoder = Mock()
        mock_encoder.encode.return_value = np.random.rand(384).tolist()
        mock_transformer.return_value = mock_encoder

        vector_store = RecipeVectorStore(db)
        vector_store.encoder = mock_encoder
        yield vector_store


class TestVectorStorePerformance:
    """Performance and behavior verification tests"""

    def test_embedding_text_generation_performance(self, db):
        """Test that embedding text generation is efficient"""
        vector_store = RecipeVectorStore(db)

        # Large recipe with lots of data
        large_recipe = {
            "name": "Complex Recipe with Many Ingredients",
            "cuisine": "Fusion",
            "description": "A very complex recipe with many steps and ingredients",
            "difficulty": "Hard",
            "tags": ["complex", "fusion", "gourmet", "restaurant-style"],
            "ingredients": [
                {"name": f"ingredient_{i}", "quantity": i, "unit": "unit"}
                for i in range(20)
            ],
            "instructions": [f"Step {i}: Do something complex" for i in range(15)],
            "nutrition": {"calories": 750, "protein_g": 35},
        }

        import time

        start_time = time.time()
        embedding_text = vector_store.create_recipe_embedding_text(large_recipe)
        end_time = time.time()

        # Should be very fast
        assert end_time - start_time < 0.1  # Less than 100ms
        assert len(embedding_text) > 0
        assert "Complex Recipe" in embedding_text

    def test_fallback_search_performance(self, db, test_user):
        """Test fallback search performance with many recipes"""
        vector_store = RecipeVectorStore(db)

        # Create many recipes
        recipes = []
        for i in range(50):
            recipe = Recipe(
                user_id=test_user.id,
                name=f"Recipe {i}",
                description=f"Description {i}",
                cuisine="Italian" if i % 2 == 0 else "Mexican",
                instructions=[f"Step {i}"],
                ingredients=[{"name": f"ingredient_{i}", "quantity": 1, "unit": "cup"}],
                tags=[f"tag_{i}"],
            )
            recipes.append(recipe)

        db.add_all(recipes)
        db.commit()

        import time

        start_time = time.time()
        results = vector_store.search_similar_recipes(query="recipe", n_results=10)
        end_time = time.time()

        # Should be reasonably fast
        assert end_time - start_time < 2.0  # Less than 2 seconds
        assert len(results) == 10
        assert all("name" in r for r in results)


# Manual verification functions for production use
def verify_vector_store_setup(db: Session) -> dict:
    """
    Manual verification function to check vector store setup.
    Returns a report of what's working and what's not.
    """
    report = {
        "embedding_support": False,
        "recipe_count": 0,
        "recipes_with_embeddings": 0,
        "sample_search_works": False,
        "popular_recipes_works": False,
        "errors": [],
    }

    try:
        vector_store = RecipeVectorStore(db)

        # Check embedding support
        report["embedding_support"] = vector_store.has_embedding_support

        # Check recipe count
        recipe_count = db.query(Recipe).count()
        report["recipe_count"] = recipe_count

        # Test sample search
        try:
            results = vector_store.search_similar_recipes("test recipe", n_results=5)
            report["sample_search_works"] = len(results) >= 0
        except Exception as e:
            report["errors"].append(f"Search error: {str(e)}")

        # Test popular recipes
        try:
            popular = vector_store.get_popular_recipes(n_results=5)
            report["popular_recipes_works"] = len(popular) >= 0
        except Exception as e:
            report["errors"].append(f"Popular recipes error: {str(e)}")

    except Exception as e:
        report["errors"].append(f"Setup error: {str(e)}")

    return report
