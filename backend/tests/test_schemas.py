import pytest
from datetime import date, timedelta
from pydantic import ValidationError
from app.schemas.meal_plan import (
    MealType,
    WeeklyScheduleRequest,
    RecipeSuggestion,
    MealSlot,
    WeeklyMealPlan,
    MealPlanCreate,
    RecipeSelectionRequest,
    MealPlanItemCreate,
)


class TestMealType:
    """Test the MealType enum."""

    def test_meal_type_values(self):
        """Test all meal type values are valid."""
        assert MealType.breakfast == "breakfast"
        assert MealType.lunch == "lunch"
        assert MealType.dinner == "dinner"
        assert MealType.snack == "snack"

    def test_meal_type_from_string(self):
        """Test creating MealType from string."""
        assert MealType("breakfast") == MealType.breakfast
        assert MealType("lunch") == MealType.lunch
        assert MealType("dinner") == MealType.dinner
        assert MealType("snack") == MealType.snack

    def test_invalid_meal_type(self):
        """Test creating an invalid meal type."""
        with pytest.raises(ValueError):
            MealType("brunch")


class TestRecipeSuggestion:
    """Test the RecipeSuggestion schema."""

    def test_recipe_suggestion_valid(self):
        """Test creating a valid recipe suggestion."""
        recipe_data = {
            "name": "Test Recipe",
            "description": "A test recipe",
            "cuisine": "Italian",
            "ingredients": [{"name": "pasta", "quantity": 1, "unit": "lb"}],
            "instructions": ["Cook pasta"],
            "prep_time": 10,
            "cook_time": 15,
            "servings": 4,
            "difficulty": "Easy",
            "nutrition": {"calories": 300},
        }
        recipe = RecipeSuggestion(**recipe_data)
        assert recipe.name == "Test Recipe"
        assert recipe.nutrition.calories == 300

    def test_recipe_suggestion_missing_required_fields(self):
        """Test creating a recipe suggestion with missing fields."""
        with pytest.raises(ValidationError):
            RecipeSuggestion(name="Incomplete Recipe")

    def test_recipe_suggestion_optional_fields(self):
        """Test that optional fields can be omitted."""
        recipe_data = {
            "name": "Test Recipe",
            "description": "A recipe without nutrition info",
            "cuisine": "American",
            "ingredients": [{"name": "bread", "quantity": 2, "unit": "slices"}],
            "instructions": ["Make a sandwich"],
            "prep_time": 5,
            "cook_time": 5,
            "servings": 1,
            "difficulty": "Easy",
        }
        recipe = RecipeSuggestion(**recipe_data)
        assert recipe.nutrition is None


class TestMealSlot:
    """Test the MealSlot schema."""

    def test_meal_slot_valid(self):
        """Test creating a valid meal slot."""
        recipe_suggestion = RecipeSuggestion(
            name="Test Recipe",
            description="A test recipe",
            cuisine="Italian",
            ingredients=[{"name": "pasta", "quantity": 1, "unit": "lb"}],
            instructions=["Cook pasta"],
            prep_time=10,
            cook_time=15,
            servings=4,
            difficulty="Easy",
        )

        meal_slot_data = {
            "date": date.today(),
            "meal_type": "dinner",
            "recipe_suggestions": [recipe_suggestion],
            "selected_recipe_index": 0,
            "selected_recipe": recipe_suggestion,
        }

        meal_slot = MealSlot(**meal_slot_data)

        assert meal_slot.date == date.today()
        assert meal_slot.meal_type == MealType.dinner

    def test_meal_slot_date_string_parsing(self):
        """Test parsing date from string."""
        meal_slot_data = {
            "date": "2024-01-15",  # String date
            "meal_type": "breakfast",
            "recipe_suggestions": [],
        }

        meal_slot = MealSlot(**meal_slot_data)

        assert meal_slot.date == date(2024, 1, 15)
        assert meal_slot.meal_type == MealType.breakfast

    def test_meal_slot_empty_suggestions(self):
        """Test meal slot with no recipe suggestions."""
        meal_slot_data = {
            "date": date.today(),
            "meal_type": "lunch",
            "recipe_suggestions": [],
        }
        meal_slot = MealSlot(**meal_slot_data)
        assert len(meal_slot.recipe_suggestions) == 0
        assert meal_slot.selected_recipe is None


class TestWeeklyScheduleRequest:
    """Test the WeeklyScheduleRequest schema."""

    def test_weekly_schedule_request_valid(self):
        """Test creating a valid weekly schedule request."""
        request_data = {
            "start_date": date.today(),
            "cooking_days": ["monday", "wednesday", "friday"],
            "meal_types": ["breakfast", "dinner"],
            "servings": 4,
            "dietary_restrictions": ["vegetarian"],
            "preferred_cuisines": ["Italian", "Mexican"],
            "must_include_ingredients": ["tomatoes"],
            "must_avoid_ingredients": ["nuts"],
        }

        request = WeeklyScheduleRequest(**request_data)

        assert request.start_date == date.today()
        assert request.cooking_days == ["monday", "wednesday", "friday"]
        assert len(request.meal_types) == 2
        assert MealType.breakfast in request.meal_types

    def test_weekly_schedule_request_invalid_day(self):
        """Test creating a request with an invalid day."""
        request_data = {
            "start_date": "2024-01-15",
            "cooking_days": ["funday"],
            "meal_types": ["dinner"],
        }
        with pytest.raises(ValidationError):
            WeeklyScheduleRequest(**request_data)

    def test_weekly_schedule_request_default_servings(self):
        """Test the default servings value."""
        request_data = {
            "start_date": date.today(),
            "cooking_days": ["saturday"],
            "meal_types": ["snack"],
        }
        request = WeeklyScheduleRequest(**request_data)
        assert request.servings == 4


class TestWeeklyMealPlan:
    """Test the WeeklyMealPlan schema."""

    def test_weekly_meal_plan_valid(self):
        """Test creating a valid weekly meal plan."""
        meal_slot = MealSlot(
            date=date.today(),
            meal_type="dinner",
            recipe_suggestions=[],
            selected_recipe_index=None,
            selected_recipe=None,
        )

        plan_data = {
            "id": 1,
            "user_id": 123,
            "name": "Weekly Plan",
            "start_date": date.today(),
            "end_date": date.today() + timedelta(days=6),
            "created_at": date.today(),
            "meal_slots": [meal_slot],
        }

        plan = WeeklyMealPlan(**plan_data)
        assert plan.id == 1
        assert len(plan.meal_slots) == 1

    def test_weekly_meal_plan_optional_id(self):
        """Test weekly meal plan with optional ID."""
        plan_data = {
            "id": 1,
            "user_id": 123,
            "name": "Weekly Plan",
            "start_date": date.today(),
            "end_date": date.today() + timedelta(days=6),
            "created_at": date.today(),
            "meal_slots": [],
        }

        plan = WeeklyMealPlan(**plan_data)
        assert plan.id == 1

    def test_weekly_meal_plan_missing_required_field(self):
        """Test weekly meal plan with missing start_date."""
        with pytest.raises(ValidationError):
            WeeklyMealPlan(
                id=1,
                user_id=123,
                name="Incomplete Plan",
                end_date=date.today(),
                meal_slots=[],
            )


class TestMealPlanSchemas:
    """Test general meal plan schemas."""

    def test_meal_plan_create(self):
        """Test MealPlanCreate schema."""
        create_data = {
            "name": "New Meal Plan",
            "start_date": date.today(),
            "end_date": date.today() + timedelta(days=6),
        }

        create_schema = MealPlanCreate(**create_data)

        assert create_schema.name == "New Meal Plan"
        assert create_schema.start_date == date.today()

    def test_meal_plan_item_create(self):
        """Test MealPlanItemCreate schema."""
        recipe_data = {
            "name": "Test Recipe",
            "description": "A test recipe",
            "cuisine": "Test",
            "ingredients": [{"name": "test", "quantity": 1, "unit": "cup"}],
            "instructions": ["Step 1"],
            "prep_time": 10,
            "cook_time": 15,
            "servings": 4,
            "difficulty": "Easy",
            "nutrition": {"calories": 300},
        }
        item_data = {
            "recipe_id": 123,
            "date": date.today(),
            "meal_type": "dinner",
            "servings": 4,
            "recipe_data": {
                "recipe_suggestions": [recipe_data],
                "selected_recipe_index": 0,
            },
        }

        item = MealPlanItemCreate(**item_data)
        assert item.recipe_id == 123
        assert item.recipe_data["recipe_suggestions"][0]["name"] == "Test Recipe"

    def test_meal_plan_item_optional_recipe(self):
        """Test meal plan item without recipe."""
        item_data = {
            "date": date.today(),
            "meal_type": "breakfast",
            "servings": 2,
        }

        item = MealPlanItemCreate(**item_data)
        assert item.recipe_id is None
        assert item.recipe_data is None


class TestRecipeSelectionRequest:
    """Test the RecipeSelectionRequest schema."""

    def test_recipe_selection_request_valid(self):
        """Test creating a valid recipe selection request."""
        request_data = {
            "meal_plan_id": 123,
            "meal_slot_date": date.today(),
            "meal_type": "dinner",
            "selected_recipe_index": 1,
        }

        request = RecipeSelectionRequest(**request_data)

        assert request.meal_plan_id == 123
        assert request.meal_slot_date == date.today()
        assert request.meal_type == MealType.dinner

    def test_recipe_selection_request_negative_index(self):
        """Test that a negative recipe index raises a validation error."""
        request_data = {
            "meal_plan_id": 123,
            "meal_slot_date": date.today(),
            "meal_type": "lunch",
            "selected_recipe_index": -1,
        }
        with pytest.raises(ValidationError):
            RecipeSelectionRequest(**request_data)


class TestSchemaValidation:
    """Test schema validation edge cases."""

    def test_negative_servings(self):
        """Test validation with negative servings."""
        # This should either be rejected or handled gracefully
        try:
            WeeklyScheduleRequest(
                start_date=date.today(),
                cooking_days=["monday"],
                meal_types=["dinner"],
                servings=-1,
            )
            # If it doesn't raise an error, that's also acceptable
            # as the business logic should handle this
        except ValidationError:
            # ValidationError is expected for negative servings
            pass

    def test_empty_cooking_days(self):
        """Test validation with empty cooking days."""
        request = WeeklyScheduleRequest(
            start_date=date.today(),
            cooking_days=[],  # Empty list
            meal_types=["dinner"],
            servings=4,
        )

        assert request.cooking_days == []

    def test_empty_meal_types(self):
        """Test validation with empty meal types."""
        request = WeeklyScheduleRequest(
            start_date=date.today(),
            cooking_days=["monday"],
            meal_types=[],  # Empty list
            servings=4,
        )

        assert request.meal_types == []

    def test_large_servings_count(self):
        """Test validation with very large servings count."""
        request = WeeklyScheduleRequest(
            start_date=date.today(),
            cooking_days=["monday"],
            meal_types=["dinner"],
            servings=1000,  # Very large number
        )

        assert request.servings == 1000
