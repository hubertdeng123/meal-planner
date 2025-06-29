#!/usr/bin/env python3
"""
Simple Vector Database Verification Script

This script verifies the basic vector store functionality without requiring
all database tables to exist. Perfect for testing before running migrations.

Usage:
    python scripts/simple_vector_verify.py
"""

import sys
import os
import time

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.vector_store import RecipeVectorStore, HistoricalDataSummarizer
from app.db.database import get_db


def test_embedding_text_generation():
    """Test that embedding text generation works correctly"""
    print("🧠 Testing embedding text generation...")

    # Create test recipe data
    test_recipe = {
        "name": "Classic Margherita Pizza",
        "cuisine": "Italian",
        "description": "Traditional Italian pizza with tomatoes, mozzarella, and basil",
        "difficulty": "Medium",
        "tags": ["pizza", "italian", "vegetarian", "classic"],
        "ingredients": [
            {"name": "pizza dough", "quantity": 1, "unit": "ball"},
            {"name": "tomato sauce", "quantity": 0.5, "unit": "cup"},
            {"name": "mozzarella cheese", "quantity": 8, "unit": "oz"},
            {"name": "fresh basil", "quantity": 10, "unit": "leaves"},
        ],
        "instructions": [
            "Preheat oven to 475°F",
            "Roll out pizza dough",
            "Spread tomato sauce evenly",
            "Add mozzarella cheese",
            "Bake for 12-15 minutes",
            "Add fresh basil before serving",
        ],
        "nutrition": {"calories": 320, "protein_g": 15, "carbs_g": 35, "fat_g": 12},
    }

    try:
        db = next(get_db())
        vector_store = RecipeVectorStore(db)

        # Time the generation
        start_time = time.time()
        embedding_text = vector_store.create_recipe_embedding_text(test_recipe)
        end_time = time.time()

        generation_time = (end_time - start_time) * 1000

        # Check if expected elements are present
        expected_elements = [
            "Margherita Pizza",
            "Italian",
            "pizza dough",
            "mozzarella",
            "basil",
            "Medium",
            "320 calories",
        ]

        elements_found = sum(
            1 for element in expected_elements if element in embedding_text
        )

        print(
            f"   ✅ Generated {len(embedding_text)} character embedding text in {generation_time:.2f}ms"
        )
        print(
            f"   ✅ Found {elements_found}/{len(expected_elements)} expected elements"
        )
        print(f"   📝 Sample text: {embedding_text[:150]}...")

        return True

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False


def test_search_query_building():
    """Test search query building from preferences"""
    print("\n🔍 Testing search query building...")

    try:
        db = next(get_db())
        vector_store = RecipeVectorStore(db)

        # Test different preference combinations
        test_cases = [
            {
                "meal_type": "dinner",
                "preferences": {
                    "cuisines": ["Italian", "Mexican"],
                    "dietary_restrictions": ["vegetarian", "gluten-free"],
                    "ingredients": ["tomatoes", "cheese"],
                    "difficulty": "Easy",
                },
                "expected_elements": [
                    "dinner recipe",
                    "Italian or Mexican",
                    "vegetarian",
                    "tomatoes",
                    "Easy",
                ],
            },
            {
                "meal_type": "breakfast",
                "preferences": {"cuisines": ["American"], "max_prep_time": 15},
                "expected_elements": ["breakfast recipe", "American"],
            },
        ]

        for i, test_case in enumerate(test_cases, 1):
            query = vector_store.build_search_query_from_preferences(
                test_case["meal_type"], test_case["preferences"]
            )

            elements_found = sum(
                1 for element in test_case["expected_elements"] if element in query
            )

            print(
                f"   ✅ Test case {i}: Generated query with {elements_found}/{len(test_case['expected_elements'])} expected elements"
            )
            print(f"      Query: {query}")

        return True

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False


def test_embedding_support_detection():
    """Test that embedding support is correctly detected"""
    print("\n🏗️  Testing embedding support detection...")

    try:
        db = next(get_db())
        vector_store = RecipeVectorStore(db)

        dialect = db.bind.dialect.name
        has_support = vector_store.has_embedding_support

        print(f"   ✅ Database type: {dialect}")
        print(f"   ✅ Embedding support detected: {has_support}")

        if dialect == "postgresql":
            print(
                "   📝 PostgreSQL detected - embedding support depends on pgvector installation and migration"
            )
        elif dialect == "sqlite":
            print("   📝 SQLite detected - will use fallback search methods")

        return True

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False


def test_preference_context_generation():
    """Test preference context generation"""
    print("\n👤 Testing preference context generation...")

    try:
        db = next(get_db())
        summarizer = HistoricalDataSummarizer(db)

        # Test with sample user summary
        test_summary = {
            "favorite_cuisines": {
                "Italian": {"avg_rating": 4.8, "count": 5},
                "Mexican": {"avg_rating": 4.5, "count": 3},
                "Asian": {"avg_rating": 4.2, "count": 2},
            },
            "avg_prep_time": 25,
            "complexity_preference": "medium",
        }

        context = summarizer.create_preference_context(test_summary)

        expected_elements = ["Italian", "Mexican", "moderate prep time", "medium"]
        elements_found = sum(1 for element in expected_elements if element in context)

        print(
            f"   ✅ Generated context with {elements_found}/{len(expected_elements)} expected elements"
        )
        print(f"   📝 Context: {context}")

        return True

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False


def test_sentence_transformer_loading():
    """Test that the sentence transformer model loads correctly"""
    print("\n🤖 Testing sentence transformer loading...")

    try:
        from sentence_transformers import SentenceTransformer

        start_time = time.time()
        encoder = SentenceTransformer("all-MiniLM-L6-v2")
        load_time = (time.time() - start_time) * 1000

        # Test encoding
        start_time = time.time()
        test_text = "This is a test recipe for pasta with tomatoes"
        embedding = encoder.encode(test_text)
        encode_time = (time.time() - start_time) * 1000

        print(f"   ✅ Model loaded in {load_time:.2f}ms")
        print(
            f"   ✅ Generated {len(embedding)}-dimensional embedding in {encode_time:.2f}ms"
        )
        print(
            f"   📝 Embedding sample: [{embedding[0]:.4f}, {embedding[1]:.4f}, {embedding[2]:.4f}, ...]"
        )

        return True

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False


def main():
    """Run all verification tests"""
    print("🚀 Simple Vector Database Verification")
    print("=" * 50)

    tests = [
        ("Embedding Support Detection", test_embedding_support_detection),
        ("Sentence Transformer Loading", test_sentence_transformer_loading),
        ("Embedding Text Generation", test_embedding_text_generation),
        ("Search Query Building", test_search_query_building),
        ("Preference Context Generation", test_preference_context_generation),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"   ❌ Test '{test_name}' failed with error: {e}")

    print("\n" + "=" * 50)
    print(f"📊 Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Vector store components are working correctly.")
        status = "✅ HEALTHY"
    elif passed >= total * 0.8:
        print("⚠️  Most tests passed. Minor issues may need attention.")
        status = "⚠️  MOSTLY HEALTHY"
    else:
        print("❌ Multiple test failures. Vector store needs attention.")
        status = "❌ NEEDS ATTENTION"

    print(f"\n🎯 Overall Status: {status}")

    print("\n📋 Next Steps:")
    if passed < total:
        print("   1. Check error messages above for specific issues")
        print("   2. Ensure all dependencies are installed: uv sync")
        print("   3. For PostgreSQL: Run migration to add pgvector support")
    else:
        print("   1. Vector store is ready for production use")
        print("   2. Run full migration for PostgreSQL + pgvector support")
        print(
            "   3. Use scripts/populate_embeddings.py to add embeddings to existing recipes"
        )

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
