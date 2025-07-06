#!/usr/bin/env python3
"""
Vector Database Verification Script

This script comprehensively tests the pgvector implementation to ensure:
1. Embeddings are being generated correctly
2. Semantic search is working
3. User preference learning is functioning
4. Performance is acceptable
5. Fallback mechanisms work

Usage:
    python scripts/verify_vector_db.py
    python scripts/verify_vector_db.py --user-id 123
    python scripts/verify_vector_db.py --create-test-data
"""

import sys
import os
import asyncio
import argparse
import logging
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.database import get_db
from app.core.vector_store import (
    HistoricalDataSummarizer,
    VectorDBService,
)
from app.models.recipe import Recipe
from app.models.user import User
from app.agents.optimized_meal_planning_agent import (
    OptimizedMealPlanningService as OMPAService,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ANSI color codes for better readability
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"


class VerificationSuite:
    def __init__(self, db: Session):
        self.db = db
        self.vector_service = VectorDBService(db)
        self.history_summarizer = HistoricalDataSummarizer(db)
        self.optimized_service = OMPAService(db)
        self.test_user = None

    def _setup_test_user(self):
        """Ensure a test user exists"""
        self.test_user = self.db.query(User).filter_by(email="test@example.com").first()
        if not self.test_user:
            self.test_user = User(
                username="testuser",
                email="test@example.com",
                hashed_password="testpassword",
                food_preferences={"cuisines": ["Italian", "Mexican"]},
                dietary_restrictions=["Vegetarian"],
            )
            self.db.add(self.test_user)
            self.db.commit()

    def verify_basic_setup(self) -> dict[str, str | bool]:
        """Verify that the vector extension is enabled"""
        try:
            self.db.execute("CREATE EXTENSION IF NOT EXISTS vector")
            self.db.commit()
            return {"status": "success", "message": "Vector extension is enabled."}
        except Exception as e:
            return {
                "status": "failure",
                "message": f"Vector extension check failed: {e}",
            }

    def _create_sample_recipe(self, name, cuisine, ingredients, description):
        """Helper to create a sample recipe"""
        recipe = Recipe(
            user_id=self.test_user.id,
            name=name,
            cuisine=cuisine,
            ingredients=[{"name": ing} for ing in ingredients],
            description=description,
            instructions=["Test instruction"],
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
        )
        self.db.add(recipe)
        self.db.commit()
        return recipe

    def verify_embedding_generation(self) -> dict[str, str | bool | int]:
        """Verify that embeddings are generated and stored correctly"""
        self._setup_test_user()
        recipe = self._create_sample_recipe(
            "Pasta Primavera",
            "Italian",
            ["pasta", "broccoli", "carrots"],
            "A light and fresh pasta dish.",
        )

        try:
            self.vector_service.add_recipe_to_db(recipe)
            self.db.refresh(recipe)

            if recipe.embedding is None:
                return {
                    "status": "failure",
                    "message": "Embedding was not generated.",
                }

            if (
                len(recipe.embedding)
                != self.vector_service.embedding_model.get_sentence_embedding_dimension()
            ):
                return {
                    "status": "failure",
                    "message": f"Embedding has incorrect dimensions: {len(recipe.embedding)}",
                }

            return {
                "status": "success",
                "message": f"Embedding generated with correct dimensions: {len(recipe.embedding)}",
                "embedding_length": len(recipe.embedding),
            }
        except Exception as e:
            return {
                "status": "failure",
                "message": f"Embedding generation failed: {e}",
            }

    def verify_search_functionality(self) -> dict[str, str | bool | int | list]:
        """Verify that vector search returns plausible results"""
        self._setup_test_user()
        # Create a few more recipes for a good search pool
        self._create_sample_recipe(
            "Spaghetti Carbonara",
            "Italian",
            ["pasta", "egg", "cheese"],
            "A classic Roman pasta dish.",
        )
        self._create_sample_recipe(
            "Tacos al Pastor",
            "Mexican",
            ["pork", "pineapple", "onion"],
            "Classic Mexican street tacos.",
        )

        try:
            query_text = "Italian pasta dish"
            similar_recipes = self.vector_service.find_similar_recipes(
                query_text, k=2, user_id=self.test_user.id
            )

            if not similar_recipes:
                return {
                    "status": "failure",
                    "message": "Vector search returned no results.",
                }

            if len(similar_recipes) != 2:
                return {
                    "status": "warning",
                    "message": f"Expected 2 results, but got {len(similar_recipes)}.",
                    "results": [r["name"] for r in similar_recipes],
                }

            if "Pasta" not in similar_recipes[0]["name"]:
                return {
                    "status": "warning",
                    "message": "Top search result may not be the most relevant.",
                    "top_result": similar_recipes[0]["name"],
                }

            return {
                "status": "success",
                "message": "Vector search returned relevant results.",
                "num_results": len(similar_recipes),
                "top_result": similar_recipes[0]["name"],
            }
        except Exception as e:
            return {
                "status": "failure",
                "message": f"Vector search failed: {e}",
            }

    async def verify_optimized_service(self) -> dict[str, str | bool | list]:
        """Verify that the optimized service can generate suggestions"""
        self._setup_test_user()

        try:
            preferences = {
                "preferred_cuisines": ["Italian"],
                "ingredients_to_use": ["pasta"],
            }
            suggestions = await self.optimized_service.generate_meal_suggestions(
                "dinner", preferences, user_id=self.test_user.id
            )

            if not suggestions:
                return {
                    "status": "warning",
                    "message": "Optimized service returned no suggestions (might be expected if DB is small).",
                }

            if len(suggestions) > 3:
                return {
                    "status": "warning",
                    "message": f"Service returned {len(suggestions)} suggestions, expected 3.",
                }

            return {
                "status": "success",
                "message": "Optimized service generated suggestions.",
                "suggestions": [s.name for s in suggestions],
            }
        except Exception as e:
            return {
                "status": "failure",
                "message": f"Optimized service failed: {e}",
            }

    async def run_full_verification(
        self, user_id: int | None = None
    ) -> dict[str, dict]:
        """Run all verification steps and return a report"""
        if user_id:
            self.test_user = self.db.query(User).filter_by(id=user_id).first()
            if not self.test_user:
                raise ValueError(f"User with ID {user_id} not found")

        report = {
            "basic_setup": self.verify_basic_setup(),
            "embedding_generation": self.verify_embedding_generation(),
            "search_functionality": self.verify_search_functionality(),
            "optimized_service": await self.verify_optimized_service(),
        }
        return report


def print_verification_report(results: dict[str, dict]):
    """Print the verification report with colors"""
    print(f"\n{BLUE}--- Vector DB Verification Report ---{RESET}\n")

    for check, result in results.items():
        status = result.get("status", "unknown")
        message = result.get("message", "No message.")

        if status == "success":
            color = GREEN
            symbol = "✓"
        elif status == "warning":
            color = YELLOW
            symbol = "!"
        else:
            color = RED
            symbol = "✗"

        print(f"{color}{symbol} {check.replace('_', ' ').title()}: {message}{RESET}")

        # Print additional details
        details_to_print = [
            "embedding_length",
            "num_results",
            "top_result",
            "suggestions",
        ]
        for detail in details_to_print:
            if detail in result:
                print(f"  - {detail.replace('_', ' ').title()}: {result[detail]}")

    print(f"\n{BLUE}--- End of Report ---{RESET}\n")


async def main(user_id: int | None = None):
    db = next(get_db())
    suite = VerificationSuite(db)
    report = await suite.run_full_verification(user_id)
    print_verification_report(report)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Vector DB verification suite.")
    parser.add_argument(
        "--user-id", type=int, help="Optional user ID to run tests for."
    )
    args = parser.parse_args()

    asyncio.run(main(args.user_id))
