from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict, Any


class MealPlanItemBase(BaseModel):
    date: date
    meal_type: str  # breakfast, lunch, dinner, snack
    servings: int = 1
    recipe_id: Optional[int] = None
    recipe_data: Optional[Dict[str, Any]] = None


class MealPlanItemCreate(MealPlanItemBase):
    pass


class MealPlanItemUpdate(BaseModel):
    date: Optional[date] = None
    meal_type: Optional[str] = None
    servings: Optional[int] = None
    recipe_id: Optional[int] = None
    recipe_data: Optional[Dict[str, Any]] = None


class MealPlanItem(MealPlanItemBase):
    id: int
    meal_plan_id: int

    class Config:
        from_attributes = True


class MealPlanBase(BaseModel):
    name: Optional[str] = None
    start_date: date
    end_date: date
    description: Optional[str] = None
    theme: Optional[str] = None
    occasion: Optional[str] = None
    budget_target: Optional[float] = None
    prep_time_preference: Optional[str] = None
    special_notes: Optional[Dict[str, Any]] = None
    week_dietary_restrictions: Optional[List[str]] = None
    week_food_preferences: Optional[Dict[str, Any]] = None


class MealPlanCreate(MealPlanBase):
    items: Optional[List[MealPlanItemCreate]] = None


class MealPlanUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    theme: Optional[str] = None
    occasion: Optional[str] = None
    budget_target: Optional[float] = None
    prep_time_preference: Optional[str] = None
    special_notes: Optional[Dict[str, Any]] = None
    week_dietary_restrictions: Optional[List[str]] = None
    week_food_preferences: Optional[Dict[str, Any]] = None


class MealPlan(MealPlanBase):
    id: int
    user_id: int
    created_at: datetime
    items: List[MealPlanItem] = []

    class Config:
        from_attributes = True


class MealPlanList(BaseModel):
    id: int
    name: Optional[str]
    start_date: date
    end_date: date
    theme: Optional[str]
    created_at: datetime
    item_count: int = 0

    class Config:
        from_attributes = True
