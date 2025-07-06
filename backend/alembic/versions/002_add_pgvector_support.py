"""Add pgvector support for recipe embeddings

Revision ID: 002_add_pgvector_support
Revises: 001_initial_schema
Create Date: 2024-06-29 00:30:00.000000

"""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = "002_add_pgvector_support"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if we're using PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Add pgvector extension
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

        # Add embedding column to recipes table for PostgreSQL
        # Using vector(384) for all-MiniLM-L6-v2 embeddings
        op.add_column("recipes", sa.Column("embedding", Vector(384), nullable=True))

        # Create index for vector similarity search
        op.execute(
            "CREATE INDEX recipes_embedding_idx ON recipes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
        )

        # Convert JSON arrays to PostgreSQL ARRAY types for better performance
        op.execute("""
            ALTER TABLE recipes
            ALTER COLUMN tags TYPE text[]
            USING CASE
                WHEN tags IS NULL THEN NULL
                WHEN jsonb_typeof(tags) = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(tags))
                ELSE ARRAY[]::text[]
            END
        """)

        op.execute("""
            ALTER TABLE recipes
            ALTER COLUMN source_urls TYPE text[]
            USING CASE
                WHEN source_urls IS NULL THEN NULL
                WHEN jsonb_typeof(source_urls) = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(source_urls))
                ELSE ARRAY[]::text[]
            END
        """)


def downgrade() -> None:
    # Check if we're using PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Convert ARRAY types back to JSON
        op.execute("""
            ALTER TABLE recipes
            ALTER COLUMN tags TYPE json
            USING CASE
                WHEN tags IS NULL THEN NULL
                ELSE to_json(tags)
            END
        """)

        op.execute("""
            ALTER TABLE recipes
            ALTER COLUMN source_urls TYPE json
            USING CASE
                WHEN source_urls IS NULL THEN NULL
                ELSE to_json(source_urls)
            END
        """)

        # Drop vector index and column
        op.execute("DROP INDEX IF EXISTS recipes_embedding_idx")
        op.drop_column("recipes", "embedding")

        # Note: We don't drop the pgvector extension as it might be used by other applications
