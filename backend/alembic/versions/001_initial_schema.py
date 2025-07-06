"""Initial database schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2024-06-29 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Increase the size of the version_num column in the alembic_version table
    op.alter_column('alembic_version', 'version_num',
                    existing_type=sa.String(length=32),
                    type_=sa.String(length=255),
                    existing_nullable=False)
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True, default=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("food_preferences", sa.JSON(), nullable=True),
        sa.Column("dietary_restrictions", sa.JSON(), nullable=True),
        # Email notification preferences
        sa.Column(
            "email_notifications_enabled", sa.Boolean(), nullable=False, default=True
        ),
        sa.Column(
            "weekly_planning_reminder", sa.Boolean(), nullable=False, default=True
        ),
        sa.Column("reminder_day_of_week", sa.Integer(), nullable=False, default=0),
        sa.Column(
            "reminder_time", sa.Time(), nullable=False, default=sa.text("'09:00:00'")
        ),
        sa.Column("timezone", sa.String(), nullable=False, default="UTC"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    # Create recipes table
    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("instructions", sa.JSON(), nullable=True),
        sa.Column("ingredients", sa.JSON(), nullable=True),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=True),
        sa.Column("cook_time_minutes", sa.Integer(), nullable=True),
        sa.Column("servings", sa.Integer(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("source_urls", sa.JSON(), nullable=True),
        sa.Column("cuisine", sa.String(), nullable=True),
        sa.Column("difficulty", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        # Nutrition information
        sa.Column("calories", sa.Float(), nullable=True),
        sa.Column("protein_g", sa.Float(), nullable=True),
        sa.Column("carbs_g", sa.Float(), nullable=True),
        sa.Column("fat_g", sa.Float(), nullable=True),
        sa.Column("fiber_g", sa.Float(), nullable=True),
        sa.Column("sugar_g", sa.Float(), nullable=True),
        sa.Column("sodium_mg", sa.Float(), nullable=True),
        # Timestamps
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recipes_cuisine"), "recipes", ["cuisine"], unique=False)
    op.create_index(op.f("ix_recipes_id"), "recipes", ["id"], unique=False)
    op.create_index(op.f("ix_recipes_name"), "recipes", ["name"], unique=False)

    # Create recipe_feedbacks table
    op.create_table(
        "recipe_feedbacks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("feedback_text", sa.Text(), nullable=True),
        sa.Column("made_it", sa.Boolean(), nullable=True, default=False),
        sa.Column("would_make_again", sa.Boolean(), nullable=True),
        sa.Column("difficulty_rating", sa.Integer(), nullable=True),
        sa.Column("taste_rating", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["recipe_id"],
            ["recipes.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recipe_feedbacks_id"), "recipe_feedbacks", ["id"], unique=False
    )

    # Create meal_plans table
    op.create_table(
        "meal_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_meal_plans_id"), "meal_plans", ["id"], unique=False)

    # Create meal_plan_items table
    op.create_table(
        "meal_plan_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meal_plan_id", sa.Integer(), nullable=True),
        sa.Column("recipe_id", sa.Integer(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("meal_type", sa.String(), nullable=True),
        sa.Column("servings", sa.Integer(), nullable=True, default=1),
        sa.Column("recipe_data", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["meal_plan_id"],
            ["meal_plans.id"],
        ),
        sa.ForeignKeyConstraint(
            ["recipe_id"],
            ["recipes.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_meal_plan_items_id"), "meal_plan_items", ["id"], unique=False
    )

    # Create grocery_lists table (without unique constraint on meal_plan_id)
    op.create_table(
        "grocery_lists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("meal_plan_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["meal_plan_id"],
            ["meal_plans.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grocery_lists_id"), "grocery_lists", ["id"], unique=False)

    # Create grocery_items table
    op.create_table(
        "grocery_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("grocery_list_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("checked", sa.Integer(), nullable=True, default=0),
        sa.ForeignKeyConstraint(
            ["grocery_list_id"],
            ["grocery_lists.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grocery_items_id"), "grocery_items", ["id"], unique=False)


def downgrade() -> None:
    # Drop all tables in reverse order
    op.drop_index(op.f("ix_grocery_items_id"), table_name="grocery_items")
    op.drop_table("grocery_items")

    op.drop_index(op.f("ix_grocery_lists_id"), table_name="grocery_lists")
    op.drop_table("grocery_lists")

    op.drop_index(op.f("ix_meal_plan_items_id"), table_name="meal_plan_items")
    op.drop_table("meal_plan_items")

    op.drop_index(op.f("ix_meal_plans_id"), table_name="meal_plans")
    op.drop_table("meal_plans")

    op.drop_index(op.f("ix_recipe_feedbacks_id"), table_name="recipe_feedbacks")
    op.drop_table("recipe_feedbacks")

    op.drop_index(op.f("ix_recipes_name"), table_name="recipes")
    op.drop_index(op.f("ix_recipes_id"), table_name="recipes")
    op.drop_index(op.f("ix_recipes_cuisine"), table_name="recipes")
    op.drop_table("recipes")

    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
