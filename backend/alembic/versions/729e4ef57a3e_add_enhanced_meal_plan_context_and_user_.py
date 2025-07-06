"""Add enhanced meal plan context and user rule preferences

Revision ID: 729e4ef57a3e
Revises: 3eacbf670302
Create Date: 2025-01-27 00:37:27.247967

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "729e4ef57a3e"
down_revision: Union[str, None] = "3eacbf670302"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add enhanced meal plan context and user rule preferences."""
    # Add enhanced contextual fields to meal_plans
    op.add_column("meal_plans", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("meal_plans", sa.Column("theme", sa.String(), nullable=True))
    op.add_column("meal_plans", sa.Column("occasion", sa.String(), nullable=True))
    op.add_column("meal_plans", sa.Column("budget_target", sa.Float(), nullable=True))
    op.add_column(
        "meal_plans", sa.Column("prep_time_preference", sa.String(), nullable=True)
    )
    op.add_column(
        "meal_plans",
        sa.Column(
            "special_notes", postgresql.JSON(astext_type=sa.Text()), nullable=True
        ),
    )
    op.add_column(
        "meal_plans",
        sa.Column(
            "week_dietary_restrictions",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        "meal_plans",
        sa.Column(
            "week_food_preferences",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
    )

    # Add enhanced rule preferences to users
    op.add_column(
        "users",
        sa.Column(
            "ingredient_rules", postgresql.JSON(astext_type=sa.Text()), nullable=True
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "food_type_rules", postgresql.JSON(astext_type=sa.Text()), nullable=True
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "nutritional_rules", postgresql.JSON(astext_type=sa.Text()), nullable=True
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "scheduling_rules", postgresql.JSON(astext_type=sa.Text()), nullable=True
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "dietary_rules", postgresql.JSON(astext_type=sa.Text()), nullable=True
        ),
    )

    # Set default values for new columns
    op.execute("UPDATE meal_plans SET special_notes = '{}' WHERE special_notes IS NULL")
    op.execute(
        "UPDATE meal_plans SET week_dietary_restrictions = '[]' WHERE week_dietary_restrictions IS NULL"
    )
    op.execute(
        "UPDATE meal_plans SET week_food_preferences = '{}' WHERE week_food_preferences IS NULL"
    )

    op.execute(
        "UPDATE users SET ingredient_rules = '{}' WHERE ingredient_rules IS NULL"
    )
    op.execute("UPDATE users SET food_type_rules = '{}' WHERE food_type_rules IS NULL")
    op.execute(
        "UPDATE users SET nutritional_rules = '{}' WHERE nutritional_rules IS NULL"
    )
    op.execute(
        "UPDATE users SET scheduling_rules = '{}' WHERE scheduling_rules IS NULL"
    )
    op.execute("UPDATE users SET dietary_rules = '{}' WHERE dietary_rules IS NULL")


def downgrade() -> None:
    """Remove enhanced meal plan context and user rule preferences."""
    # Remove columns from meal_plans
    op.drop_column("meal_plans", "week_food_preferences")
    op.drop_column("meal_plans", "week_dietary_restrictions")
    op.drop_column("meal_plans", "special_notes")
    op.drop_column("meal_plans", "prep_time_preference")
    op.drop_column("meal_plans", "budget_target")
    op.drop_column("meal_plans", "occasion")
    op.drop_column("meal_plans", "theme")
    op.drop_column("meal_plans", "description")

    # Remove columns from users
    op.drop_column("users", "dietary_rules")
    op.drop_column("users", "scheduling_rules")
    op.drop_column("users", "nutritional_rules")
    op.drop_column("users", "food_type_rules")
    op.drop_column("users", "ingredient_rules")
