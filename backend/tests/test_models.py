import pytest
from datetime import date, timedelta
from app.models.meal_plan import MealPlan, MealPlanItem, GroceryList, GroceryItem


class TestMealPlanModel:
    """Test the MealPlan database model."""

    def test_create_meal_plan(self, db, test_user):
        """Test creating a meal plan."""
        meal_plan = MealPlan(
            user_id=test_user.id,
            name="Test Meal Plan",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=6),
        )

        db.add(meal_plan)
        db.commit()
        db.refresh(meal_plan)

        assert meal_plan.id is not None
        assert meal_plan.user_id == test_user.id
        assert meal_plan.name == "Test Meal Plan"
        assert isinstance(meal_plan.start_date, date)
        assert isinstance(meal_plan.end_date, date)
        assert meal_plan.created_at is not None

    def test_meal_plan_user_relationship(self, db, test_user):
        """Test the relationship between meal plan and user."""
        meal_plan = MealPlan(
            user_id=test_user.id,
            name="Test Meal Plan",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=6),
        )

        db.add(meal_plan)
        db.commit()
        db.refresh(meal_plan)

        # Test relationship
        assert meal_plan.user is not None
        assert meal_plan.user.id == test_user.id
        assert meal_plan.user.email == test_user.email

    def test_meal_plan_cascading_delete(self, db, test_user):
        """Test that deleting a meal plan cascades to meal plan items."""
        meal_plan = MealPlan(
            user_id=test_user.id,
            name="Test Meal Plan",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=6),
        )
        db.add(meal_plan)
        db.commit()
        db.refresh(meal_plan)

        # Add meal plan item
        meal_item = MealPlanItem(
            meal_plan_id=meal_plan.id, date=date.today(), meal_type="dinner", servings=4
        )
        db.add(meal_item)
        db.commit()

        # Delete meal plan
        db.delete(meal_plan)
        db.commit()

        # Verify meal plan item was also deleted
        remaining_items = (
            db.query(MealPlanItem)
            .filter(MealPlanItem.meal_plan_id == meal_plan.id)
            .all()
        )
        assert len(remaining_items) == 0


class TestMealPlanItemModel:
    """Test the MealPlanItem database model."""

    def test_create_meal_plan_item(self, db, test_meal_plan, test_recipe):
        """Test creating a meal plan item."""
        meal_item = MealPlanItem(
            meal_plan_id=test_meal_plan.id,
            recipe_id=test_recipe.id,
            date=date.today(),
            meal_type="dinner",
            servings=4,
            recipe_data={"selected_recipe_index": 0},
        )

        db.add(meal_item)
        db.commit()
        db.refresh(meal_item)

        assert meal_item.id is not None
        assert meal_item.meal_plan_id == test_meal_plan.id
        assert meal_item.recipe_id == test_recipe.id
        assert meal_item.meal_type == "dinner"
        assert meal_item.servings == 4
        assert meal_item.recipe_data["selected_recipe_index"] == 0

    def test_meal_plan_item_without_recipe(self, db, test_meal_plan):
        """Test creating a meal plan item without a recipe."""
        meal_item = MealPlanItem(
            meal_plan_id=test_meal_plan.id,
            date=date.today(),
            meal_type="breakfast",
            servings=2,
            recipe_data={"ai_generated": True},
        )

        db.add(meal_item)
        db.commit()
        db.refresh(meal_item)

        assert meal_item.id is not None
        assert meal_item.recipe_id is None
        assert meal_item.recipe_data["ai_generated"] is True

    def test_meal_plan_item_relationships(self, db, test_meal_plan, test_recipe):
        """Test meal plan item relationships."""
        meal_item = MealPlanItem(
            meal_plan_id=test_meal_plan.id,
            recipe_id=test_recipe.id,
            date=date.today(),
            meal_type="lunch",
            servings=1,
        )

        db.add(meal_item)
        db.commit()
        db.refresh(meal_item)

        # Test meal plan relationship
        assert meal_item.meal_plan is not None
        assert meal_item.meal_plan.id == test_meal_plan.id

        # Test recipe relationship
        assert meal_item.recipe is not None
        assert meal_item.recipe.id == test_recipe.id


class TestGroceryListModel:
    """Test the GroceryList database model."""

    def test_create_grocery_list(self, db, test_user, test_meal_plan):
        """Test creating a grocery list."""
        grocery_list = GroceryList(user_id=test_user.id, meal_plan_id=test_meal_plan.id)

        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        assert grocery_list.id is not None
        assert grocery_list.user_id == test_user.id
        assert grocery_list.meal_plan_id == test_meal_plan.id
        assert grocery_list.created_at is not None
        assert grocery_list.updated_at is not None

    def test_grocery_list_without_meal_plan(self, db, test_user):
        """Test creating a grocery list without a meal plan."""
        grocery_list = GroceryList(user_id=test_user.id)

        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        assert grocery_list.id is not None
        assert grocery_list.meal_plan_id is None

    def test_grocery_list_cascading_delete(self, db, test_user):
        """Test that deleting a grocery list cascades to grocery items."""
        grocery_list = GroceryList(user_id=test_user.id)
        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        # Add grocery item
        grocery_item = GroceryItem(
            grocery_list_id=grocery_list.id,
            name="Test Item",
            quantity=1.0,
            unit="piece",
            category="test",
        )
        db.add(grocery_item)
        db.commit()

        # Delete grocery list
        db.delete(grocery_list)
        db.commit()

        # Verify grocery item was also deleted
        remaining_items = (
            db.query(GroceryItem)
            .filter(GroceryItem.grocery_list_id == grocery_list.id)
            .all()
        )
        assert len(remaining_items) == 0


class TestGroceryItemModel:
    """Test the GroceryItem database model."""

    def test_create_grocery_item(self, db, test_user):
        """Test creating a grocery item."""
        grocery_list = GroceryList(user_id=test_user.id)
        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        grocery_item = GroceryItem(
            grocery_list_id=grocery_list.id,
            name="Tomatoes",
            quantity=2.5,
            unit="lbs",
            category="produce",
            checked=0,
        )

        db.add(grocery_item)
        db.commit()
        db.refresh(grocery_item)

        assert grocery_item.id is not None
        assert grocery_item.name == "Tomatoes"
        assert grocery_item.quantity == 2.5
        assert grocery_item.unit == "lbs"
        assert grocery_item.category == "produce"
        assert grocery_item.checked == 0

    def test_grocery_item_checked_status(self, db, test_user):
        """Test grocery item checked status."""
        grocery_list = GroceryList(user_id=test_user.id)
        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        grocery_item = GroceryItem(
            grocery_list_id=grocery_list.id,
            name="Milk",
            quantity=1.0,
            unit="gallon",
            category="dairy",
            checked=1,  # Checked
        )

        db.add(grocery_item)
        db.commit()
        db.refresh(grocery_item)

        assert grocery_item.checked == 1

        # Update to unchecked
        grocery_item.checked = 0
        db.commit()

        assert grocery_item.checked == 0

    def test_grocery_item_relationship(self, db, test_user):
        """Test grocery item relationship with grocery list."""
        grocery_list = GroceryList(user_id=test_user.id)
        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        grocery_item = GroceryItem(
            grocery_list_id=grocery_list.id,
            name="Bread",
            quantity=1.0,
            unit="loaf",
            category="bakery",
        )

        db.add(grocery_item)
        db.commit()
        db.refresh(grocery_item)

        # Test relationship
        assert grocery_item.grocery_list is not None
        assert grocery_item.grocery_list.id == grocery_list.id
        assert grocery_item.grocery_list.user_id == test_user.id


class TestModelConstraints:
    """Test database model constraints and validations."""

    def test_meal_plan_required_fields(self, db, test_user):
        """Test that meal plan requires essential fields."""
        # Test missing start_date
        with pytest.raises(Exception):
            meal_plan = MealPlan(
                user_id=test_user.id,
                name="Test Plan",
                end_date=date.today() + timedelta(days=6),
                # Missing start_date
            )
            db.add(meal_plan)
            db.commit()

    def test_grocery_item_required_fields(self, db, test_user):
        """Test that grocery item requires essential fields."""
        grocery_list = GroceryList(user_id=test_user.id)
        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        # Test missing name
        with pytest.raises(Exception):
            grocery_item = GroceryItem(
                grocery_list_id=grocery_list.id,
                quantity=1.0,
                unit="piece",
                # Missing name
            )
            db.add(grocery_item)
            db.commit()

    def test_foreign_key_constraints(self, db):
        """Test foreign key constraints."""
        # Test invalid user_id in meal plan
        # SQLite by default doesn't enforce foreign key constraints in memory
        # so we need to test this differently or skip this test
        pytest.skip(
            "SQLite in-memory database doesn't enforce foreign key constraints by default"
        )
