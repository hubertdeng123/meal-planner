from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any, Union
from datetime import date, datetime
from enum import Enum
from app.models.recipe import Recipe


class MealType(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class RecipeSuggestion(BaseModel):
    id: Optional[int] = None  # Include ID for saved recipes
    name: str
    description: str
    cuisine: str
    ingredients: List[Dict[str, Any]]
    instructions: List[str]
    prep_time: int
    cook_time: int
    servings: int
    difficulty: str
    nutrition: Optional[Dict[str, Any]] = None


class MealSlot(BaseModel):
    date: Union[date, str]  # Accept both date objects and date strings
    meal_type: MealType
    recipe_suggestions: List[RecipeSuggestion] = []
    selected_recipe_index: Optional[int] = None
    selected_recipe: Optional[RecipeSuggestion] = None

    @field_validator("date", mode="before")
    @classmethod
    def parse_date(cls, v):
        """Parse date string to date object if needed"""
        if isinstance(v, str):
            try:
                from datetime import datetime

                return datetime.strptime(v, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Invalid date format. Use YYYY-MM-DD")
        return v


class WeeklyScheduleRequest(BaseModel):
    start_date: Union[date, str]  # Accept both date objects and date strings
    cooking_days: List[str]  # ["monday", "tuesday", etc.]
    meal_types: List[MealType]  # Which meals to plan
    servings: int = 4
    difficulty: Optional[str] = None  # easy, medium, hard
    dietary_restrictions: Optional[List[str]] = []
    preferred_cuisines: Optional[List[str]] = []
    must_include_ingredients: Optional[List[str]] = []
    must_avoid_ingredients: Optional[List[str]] = []

    @field_validator("start_date", mode="before")
    @classmethod
    def parse_start_date(cls, v):
        """Parse date string to date object if needed"""
        if isinstance(v, str):
            try:
                from datetime import datetime

                return datetime.strptime(v, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Invalid date format. Use YYYY-MM-DD")
        return v


class WeeklyMealPlan(BaseModel):
    id: Optional[int] = None
    user_id: int
    name: str
    start_date: date
    end_date: date
    meal_slots: List[MealSlot]
    created_at: Optional[datetime] = None


class MealPlanBase(BaseModel):
    name: str
    start_date: date
    end_date: date


class MealPlanCreate(MealPlanBase):
    pass


class MealPlanUpdate(BaseModel):
    name: Optional[str] = None


class MealPlan(MealPlanBase):
    id: int
    user_id: int
    created_at: datetime
    items: List["MealPlanItem"] = []

    model_config = {"from_attributes": True}


class MealPlanItemBase(BaseModel):
    recipe_id: Optional[int] = None
    date: date
    meal_type: MealType
    servings: int = 4
    recipe_data: Optional[Dict[str, Any]] = None  # Store AI-generated recipe data


class MealPlanItemCreate(MealPlanItemBase):
    pass


class MealPlanItemUpdate(BaseModel):
    recipe_id: Optional[int] = None
    servings: Optional[int] = None
    recipe_data: Optional[Dict[str, Any]] = None


class MealPlanItem(MealPlanItemBase):
    id: int
    meal_plan_id: int
    recipe: Optional["Recipe"] = None

    model_config = {"from_attributes": True}


class RecipeSelectionRequest(BaseModel):
    meal_plan_id: int
    meal_slot_date: Union[date, str]  # Accept both date objects and date strings
    meal_type: MealType
    selected_recipe_index: int

    @field_validator("meal_slot_date", mode="before")
    @classmethod
    def parse_meal_slot_date(cls, v):
        """Parse date string to date object if needed"""
        if isinstance(v, str):
            try:
                from datetime import datetime

                return datetime.strptime(v, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Invalid date format. Use YYYY-MM-DD")
        return v


MealPlanItem.model_rebuild()
MealPlan.model_rebuild()
