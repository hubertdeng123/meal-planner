#!/usr/bin/env python3
"""
Script to populate vector embeddings for existing recipes.
Run this after migrating to pgvector to enable semantic search.
"""

import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.vector_store import RecipeVectorStore
from app.db.database import get_db
from app.models.recipe import Recipe
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def populate_embeddings():
    """Populate embeddings for all recipes without them"""
    try:
        # Get database session
        db = next(get_db())
        vector_store = RecipeVectorStore(db)

        # Get all recipes without embeddings
        recipes_without_embeddings = (
            db.query(Recipe).filter(Recipe.embedding.is_(None)).all()
        )

        total_recipes = len(recipes_without_embeddings)
        logger.info(f"Found {total_recipes} recipes without embeddings")

        if total_recipes == 0:
            logger.info("All recipes already have embeddings!")
            return

        # Process recipes
        success_count = 0
        error_count = 0

        for i, recipe in enumerate(recipes_without_embeddings, 1):
            try:
                logger.info(f"Processing {i}/{total_recipes}: {recipe.name}")

                success = vector_store.add_recipe_embedding(recipe.id)

                if success:
                    success_count += 1
                    logger.info(f"✅ Added embedding for: {recipe.name}")
                else:
                    error_count += 1
                    logger.error(f"❌ Failed to add embedding for: {recipe.name}")

                # Progress update every 10 recipes
                if i % 10 == 0:
                    logger.info(
                        f"Progress: {i}/{total_recipes} ({i / total_recipes * 100:.1f}%)"
                    )

            except Exception as e:
                error_count += 1
                logger.error(f"❌ Error processing {recipe.name}: {e}")

        # Final summary
        logger.info("\n" + "=" * 50)
        logger.info("EMBEDDING POPULATION COMPLETE")
        logger.info(f"Total recipes processed: {total_recipes}")
        logger.info(f"Successfully added: {success_count}")
        logger.info(f"Errors: {error_count}")
        logger.info(f"Success rate: {success_count / total_recipes * 100:.1f}%")
        logger.info("=" * 50)

        if success_count > 0:
            logger.info("\n🎉 Vector search is now enabled!")
            logger.info(
                "Users will start seeing faster, more personalized recipe suggestions."
            )

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(populate_embeddings())
