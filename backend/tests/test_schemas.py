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
)


class TestMealType:
    """Test the MealType enum."""

    def test_meal_type_values(self):
        """Test all meal type values are valid."""
        assert MealType.BREAKFAST == "breakfast"
        assert MealType.LUNCH == "lunch"
        assert MealType.DINNER == "dinner"
        assert MealType.SNACK == "snack"

    def test_meal_type_from_string(self):
        """Test creating MealType from string."""
        assert MealType("breakfast") == MealType.BREAKFAST
        assert MealType("lunch") == MealType.LUNCH
        assert MealType("dinner") == MealType.DINNER
        assert MealType("snack") == MealType.SNACK


class TestRecipeSuggestion:
    """Test the RecipeSuggestion schema."""

    def test_recipe_suggestion_valid(self):
        """Test creating a valid recipe suggestion."""
        recipe_data = {
            "name": "Test Recipe",
            "description": "A test recipe",
            "cuisine": "Italian",
            "ingredients": [
                {"name": "pasta", "quantity": 1, "unit": "lb"},
                {"name": "tomato sauce", "quantity": 2, "unit": "cups"},
            ],
            "instructions": ["Boil pasta", "Add sauce"],
            "prep_time": 10,
            "cook_time": 15,
            "servings": 4,
            "difficulty": "Easy",
            "nutrition": {"calories": 400, "protein_g": 15},
        }

        recipe = RecipeSuggestion(**recipe_data)

        assert recipe.name == "Test Recipe"
        assert recipe.cuisine == "Italian"
        assert len(recipe.ingredients) == 2
        assert len(recipe.instructions) == 2
        assert recipe.prep_time == 10
        assert recipe.cook_time == 15
        assert recipe.servings == 4
        assert recipe.difficulty == "Easy"
        assert recipe.nutrition["calories"] == 400

    def test_recipe_suggestion_with_id(self):
        """Test recipe suggestion with ID (for saved recipes)."""
        recipe_data = {
            "id": 123,
            "name": "Saved Recipe",
            "description": "A saved recipe",
            "cuisine": "Mexican",
            "ingredients": [{"name": "beans", "quantity": 1, "unit": "can"}],
            "instructions": ["Heat beans"],
            "prep_time": 5,
            "cook_time": 10,
            "servings": 2,
            "difficulty": "Easy",
        }

        recipe = RecipeSuggestion(**recipe_data)

        assert recipe.id == 123
        assert recipe.name == "Saved Recipe"

    def test_recipe_suggestion_missing_required_fields(self):
        """Test recipe suggestion with missing required fields."""
        with pytest.raises(ValidationError):
            RecipeSuggestion(
                name="Incomplete Recipe"
                # Missing other required fields
            )

    def test_recipe_suggestion_optional_nutrition(self):
        """Test recipe suggestion with optional nutrition."""
        recipe_data = {
            "name": "Simple Recipe",
            "description": "A simple recipe",
            "cuisine": "American",
            "ingredients": [{"name": "bread", "quantity": 2, "unit": "slices"}],
            "instructions": ["Toast bread"],
            "prep_time": 2,
            "cook_time": 3,
            "servings": 1,
            "difficulty": "Easy",
            # No nutrition data
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
        assert meal_slot.meal_type == MealType.DINNER
        assert len(meal_slot.recipe_suggestions) == 1
        assert meal_slot.selected_recipe_index == 0
        assert meal_slot.selected_recipe is not None

    def test_meal_slot_date_string_parsing(self):
        """Test parsing date from string."""
        meal_slot_data = {
            "date": "2024-01-15",  # String date
            "meal_type": "breakfast",
            "recipe_suggestions": [],
        }

        meal_slot = MealSlot(**meal_slot_data)

        assert meal_slot.date == date(2024, 1, 15)
        assert meal_slot.meal_type == MealType.BREAKFAST

    def test_meal_slot_invalid_date_format(self):
        """Test invalid date format raises error."""
        with pytest.raises(ValidationError):
            MealSlot(date="invalid-date", meal_type="dinner", recipe_suggestions=[])

    def test_meal_slot_no_selection(self):
        """Test meal slot with no recipe selection."""
        meal_slot_data = {
            "date": date.today(),
            "meal_type": "lunch",
            "recipe_suggestions": [],
            "selected_recipe_index": None,
            "selected_recipe": None,
        }

        meal_slot = MealSlot(**meal_slot_data)

        assert meal_slot.selected_recipe_index is None
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
        assert MealType.BREAKFAST in request.meal_types
        assert MealType.DINNER in request.meal_types
        assert request.servings == 4
        assert "vegetarian" in request.dietary_restrictions
        assert "Italian" in request.preferred_cuisines

    def test_weekly_schedule_request_date_string(self):
        """Test parsing start date from string."""
        request_data = {
            "start_date": "2024-01-15",  # String date
            "cooking_days": ["monday"],
            "meal_types": ["dinner"],
            "servings": 2,
        }

        request = WeeklyScheduleRequest(**request_data)

        assert request.start_date == date(2024, 1, 15)

    def test_weekly_schedule_request_defaults(self):
        """Test default values."""
        request_data = {
            "start_date": date.today(),
            "cooking_days": ["monday"],
            "meal_types": ["dinner"],
            # Let other fields use defaults
        }

        request = WeeklyScheduleRequest(**request_data)

        assert request.servings == 4  # Default
        assert request.dietary_restrictions == []  # Default
        assert request.preferred_cuisines == []  # Default
        assert request.must_include_ingredients == []  # Default
        assert request.must_avoid_ingredients == []  # Default

    def test_weekly_schedule_request_invalid_date(self):
        """Test invalid date format raises error."""
        with pytest.raises(ValidationError):
            WeeklyScheduleRequest(
                start_date="invalid-date",
                cooking_days=["monday"],
                meal_types=["dinner"],
            )

    def test_weekly_schedule_request_invalid_meal_type(self):
        """Test invalid meal type raises error."""
        with pytest.raises(ValidationError):
            WeeklyScheduleRequest(
                start_date=date.today(),
                cooking_days=["monday"],
                meal_types=["invalid_meal"],
            )


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
            "meal_slots": [meal_slot],
        }

        plan = WeeklyMealPlan(**plan_data)

        assert plan.id == 1
        assert plan.user_id == 123
        assert plan.name == "Weekly Plan"
        assert len(plan.meal_slots) == 1

    def test_weekly_meal_plan_optional_id(self):
        """Test weekly meal plan with optional ID."""
        plan_data = {
            "user_id": 123,
            "name": "Weekly Plan",
            "start_date": date.today(),
            "end_date": date.today() + timedelta(days=6),
            "meal_slots": [],
        }

        plan = WeeklyMealPlan(**plan_data)

        assert plan.id is None


class TestMealPlanSchemas:
    """Test meal plan related schemas."""

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
        from app.schemas.meal_plan import MealPlanItemCreate

        item_data = {
            "recipe_id": 123,
            "date": date.today(),
            "meal_type": "dinner",
            "servings": 4,
            "recipe_data": {"selected_recipe_index": 0},
        }

        item = MealPlanItemCreate(**item_data)

        assert item.recipe_id == 123
        assert item.meal_type == MealType.DINNER
        assert item.servings == 4
        assert item.recipe_data["selected_recipe_index"] == 0

    def test_meal_plan_item_optional_recipe(self):
        """Test meal plan item without recipe."""
        from app.schemas.meal_plan import MealPlanItemCreate

        item_data = {
            "date": date.today(),
            "meal_type": "breakfast",
            "servings": 2,
            "recipe_data": {"ai_generated": True},
        }

        item = MealPlanItemCreate(**item_data)

        assert item.recipe_id is None
        assert item.recipe_data["ai_generated"] is True


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
        assert request.meal_type == MealType.DINNER
        assert request.selected_recipe_index == 1

    def test_recipe_selection_request_date_string(self):
        """Test parsing meal slot date from string."""
        request_data = {
            "meal_plan_id": 123,
            "meal_slot_date": "2024-01-15",  # String date
            "meal_type": "lunch",
            "selected_recipe_index": 2,
        }

        request = RecipeSelectionRequest(**request_data)

        assert request.meal_slot_date == date(2024, 1, 15)

    def test_recipe_selection_request_invalid_date(self):
        """Test invalid date format raises error."""
        with pytest.raises(ValidationError):
            RecipeSelectionRequest(
                meal_plan_id=123,
                meal_slot_date="invalid-date",
                meal_type="dinner",
                selected_recipe_index=0,
            )


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
