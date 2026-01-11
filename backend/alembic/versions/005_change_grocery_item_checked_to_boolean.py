"""Change grocery_items.checked from integer to boolean

Revision ID: 005_change_grocery_item_checked_to_boolean
Revises: 004_add_enhanced_meal_plan_context_and_user_preferences
Create Date: 2025-01-11

"""

from typing import Sequence, Union

from alembic import op

revision: str = "005_change_grocery_item_checked_to_boolean"
down_revision: Union[str, None] = (
    "004_add_enhanced_meal_plan_context_and_user_preferences"
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert checked column from integer to boolean."""
    # First, convert any NULL values to 0 (will become false)
    op.execute("UPDATE grocery_items SET checked = 0 WHERE checked IS NULL")

    # Change column type with proper casting, add NOT NULL, set new default
    op.execute(
        "ALTER TABLE grocery_items "
        "ALTER COLUMN checked DROP DEFAULT, "
        "ALTER COLUMN checked TYPE BOOLEAN USING (checked = 1), "
        "ALTER COLUMN checked SET NOT NULL, "
        "ALTER COLUMN checked SET DEFAULT false"
    )


def downgrade() -> None:
    """Convert checked column back to integer."""
    op.execute(
        "ALTER TABLE grocery_items "
        "ALTER COLUMN checked DROP DEFAULT, "
        "ALTER COLUMN checked TYPE INTEGER USING CASE WHEN checked THEN 1 ELSE 0 END, "
        "ALTER COLUMN checked DROP NOT NULL, "
        "ALTER COLUMN checked SET DEFAULT 0"
    )
