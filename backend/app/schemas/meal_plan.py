from __future__ import annotations
from pydantic import BaseModel, Field, validator
from datetime import date, datetime
from enum import Enum
from .recipe import RecipeSuggestion, Recipe as RecipeSchema


class MealType(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


class PrepTimePreference(str, Enum):
    QUICK = "quick"
    MODERATE = "moderate"
    RELAXED = "relaxed"


class MealPlanBase(BaseModel):
    name: str
    start_date: date
    end_date: date
    description: str | None = None
    theme: str | None = None
    occasion: str | None = None
    budget_target: float | None = None
    prep_time_preference: PrepTimePreference | None = None
    special_notes: dict[str, str] | None = None
    week_dietary_restrictions: list[str] | None = None
    week_food_preferences: dict[str, list[str]] | None = None


class MealPlanItemBase(BaseModel):
    date: date
    meal_type: MealType


class MealPlanItem(MealPlanItemBase):
    model_config = {"from_attributes": True}
    id: int
    meal_plan_id: int
    recipe: RecipeSchema | None = None
    recipe_data: dict | None = None


class MealPlan(MealPlanBase):
    model_config = {"from_attributes": True}
    id: int
    user_id: int
    created_at: datetime
    items: list[MealPlanItem] = []


class MealPlanCreate(MealPlanBase):
    pass


class MealPlanItemCreate(MealPlanItemBase):
    recipe_id: int | None = None
    servings: int = 4
    recipe_data: dict | None = None


class MealPlanItemUpdate(BaseModel):
    recipe_id: int | None = None
    servings: int | None = None
    recipe_data: dict | None = None


class MealSlot(BaseModel):
    date: date
    meal_type: MealType
    recipe_suggestions: list[RecipeSuggestion]
    selected_recipe_index: int | None = None
    selected_recipe: RecipeSuggestion | None = None


class WeeklyMealPlan(MealPlan):
    meal_slots: list[MealSlot] = []


class WeeklyScheduleRequest(BaseModel):
    start_date: date
    cooking_days: list[str] = Field(
        ...,
        example=["monday", "wednesday", "friday"],
        description="Days of the week to cook",
    )
    meal_types: list[MealType] = Field(
        ..., example=[MealType.dinner], description="Types of meals to plan"
    )
    servings: int = Field(4, gt=0)
    difficulty: str | None = None
    preferred_cuisines: list[str] | None = []
    dietary_restrictions: list[str] | None = []
    must_include_ingredients: list[str] | None = []
    must_avoid_ingredients: list[str] | None = []
    # Enhanced Fields
    description: str | None = Field(
        None, example="Family-friendly meals for a busy week"
    )
    theme: str | None = Field(None, example="Italian Night")
    occasion: str | None = Field(None, example="Birthday Celebration")
    budget_target: float | None = Field(None, example=150.00)
    prep_time_preference: PrepTimePreference | None = Field(
        None, example=PrepTimePreference.MODERATE
    )
    special_notes: dict[str, str] | None = Field(None, example={"kid_friendly": "true"})
    week_dietary_restrictions: list[str] | None = Field(None, example=["low-fodmap"])
    week_food_preferences: dict[str, list[str]] | None = Field(
        None, example={"protein_source": ["chicken", "fish"]}
    )

    @validator("cooking_days")
    def validate_cooking_days(cls, v):
        valid_days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]
        for day in v:
            if day.lower() not in valid_days:
                raise ValueError(f"Invalid day: {day}")
        return v


class RecipeSelectionRequest(BaseModel):
    meal_plan_id: int
    meal_slot_date: date
    meal_type: MealType
    selected_recipe_index: int

    @validator("selected_recipe_index")
    def validate_index(cls, v):
        if v < 0:
            raise ValueError("Index cannot be negative")
        return v


MealPlan.model_rebuild()
MealPlanItem.model_rebuild()
WeeklyMealPlan.model_rebuild()
