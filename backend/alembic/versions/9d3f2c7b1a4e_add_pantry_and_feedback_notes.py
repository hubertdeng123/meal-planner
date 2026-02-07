"""Add pantry items and normalize recipe feedback notes

Revision ID: 9d3f2c7b1a4e
Revises: 701e5a180d5d
Create Date: 2026-02-07 23:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9d3f2c7b1a4e"
down_revision = "701e5a180d5d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pantry_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(length=64), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pantry_items_id"), "pantry_items", ["id"], unique=False)
    op.create_index(
        op.f("ix_pantry_items_user_id"), "pantry_items", ["user_id"], unique=False
    )

    with op.batch_alter_table("recipe_feedbacks") as batch_op:
        batch_op.alter_column(
            "rating",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))

    op.execute(
        "UPDATE recipe_feedbacks SET notes = feedback_text WHERE feedback_text IS NOT NULL"
    )

    with op.batch_alter_table("recipe_feedbacks") as batch_op:
        batch_op.drop_column("feedback_text")


def downgrade() -> None:
    with op.batch_alter_table("recipe_feedbacks") as batch_op:
        batch_op.add_column(sa.Column("feedback_text", sa.Text(), nullable=True))

    op.execute(
        "UPDATE recipe_feedbacks SET feedback_text = notes WHERE notes IS NOT NULL"
    )

    with op.batch_alter_table("recipe_feedbacks") as batch_op:
        batch_op.drop_column("notes")

    op.execute("UPDATE recipe_feedbacks SET rating = 0 WHERE rating IS NULL")

    with op.batch_alter_table("recipe_feedbacks") as batch_op:
        batch_op.alter_column(
            "rating",
            existing_type=sa.Integer(),
            nullable=False,
        )

    op.drop_index(op.f("ix_pantry_items_user_id"), table_name="pantry_items")
    op.drop_index(op.f("ix_pantry_items_id"), table_name="pantry_items")
    op.drop_table("pantry_items")
