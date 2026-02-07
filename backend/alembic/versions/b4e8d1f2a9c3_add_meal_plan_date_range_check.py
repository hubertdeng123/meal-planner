"""Add meal plan date range check constraint

Revision ID: b4e8d1f2a9c3
Revises: 9d3f2c7b1a4e
Create Date: 2026-02-08 10:25:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "b4e8d1f2a9c3"
down_revision = "9d3f2c7b1a4e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("meal_plans") as batch_op:
        batch_op.create_check_constraint(
            "ck_meal_plans_date_range",
            "start_date <= end_date",
        )


def downgrade() -> None:
    with op.batch_alter_table("meal_plans") as batch_op:
        batch_op.drop_constraint("ck_meal_plans_date_range", type_="check")
