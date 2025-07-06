from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, time


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class FoodPreferences(BaseModel):
    model_config = {"from_attributes": True}
    """Schema for food preferences"""
    cuisines: list[str] = []
    favorite_ingredients: list[str] = []
    cooking_methods: list[str] = []
    preferred_spice_level: str | None = (
        None  # "none", "mild", "medium", "hot", "very_hot"
    )
    flavor_profiles: list[str] = []
    loved_ingredients: list[str] = []
    disliked_ingredients: list[str] = []


class UserPreferences(BaseModel):
    model_config = {"from_attributes": True}
    food_preferences: FoodPreferences = Field(default_factory=FoodPreferences)
    dietary_restrictions: list[str] = []
    ingredient_rules: "IngredientRules" = Field(
        default_factory=lambda: IngredientRules()
    )
    food_type_rules: "FoodTypeRules" = Field(default_factory=lambda: FoodTypeRules())
    nutritional_rules: "NutritionalRules" = Field(
        default_factory=lambda: NutritionalRules()
    )
    scheduling_rules: "SchedulingRules" = Field(
        default_factory=lambda: SchedulingRules()
    )
    dietary_rules: "DietaryRules" = Field(default_factory=lambda: DietaryRules())


class IngredientRules(BaseModel):
    model_config = {"from_attributes": True}
    """Schema for ingredient rules"""
    must_include: list[
        dict[str, str]
    ] = []  # [{"ingredient": "garlic", "reason": "health benefits"}]
    must_avoid: list[
        dict[str, str]
    ] = []  # [{"ingredient": "peanuts", "reason": "allergy"}]
    preferred: list[
        dict[str, str]
    ] = []  # [{"ingredient": "olive oil", "reason": "taste preference"}]
    disliked: list[
        dict[str, str]
    ] = []  # [{"ingredient": "cilantro", "reason": "taste"}]


class FoodTypeRules(BaseModel):
    model_config = {"from_attributes": True}
    """Schema for food type rules"""
    protein_preferences: list[str] = []  # ["chicken", "fish", "tofu"]
    protein_frequency: dict[
        str, int
    ] = {}  # {"beef": 2, "chicken": 4}  # times per week
    cooking_methods_preferred: list[str] = []  # ["grilling", "baking", "steaming"]
    cooking_methods_avoided: list[str] = []  # ["frying", "deep-frying"]
    meal_complexity_preference: str = "medium"  # "simple", "medium", "complex"
    cuisine_rotation: dict[
        str, int
    ] = {}  # {"italian": 2, "asian": 3}  # times per week


class NutritionalRules(BaseModel):
    model_config = {"from_attributes": True}
    """Schema for nutritional rules"""
    daily_calorie_target: int | None = None
    daily_calorie_range: dict[str, int] | None = None  # {"min": 1800, "max": 2200}
    macro_targets: dict[str, int] | None = (
        None  # {"protein_g": 120, "carbs_g": 200, "fat_g": 67}
    )
    max_sodium_mg: int | None = None
    min_fiber_g: int | None = None
    max_sugar_g: int | None = None
    special_nutritional_needs: list[
        str
    ] = []  # ["high-protein", "low-carb", "heart-healthy"]


class SchedulingRules(BaseModel):
    model_config = {"from_attributes": True}
    """Schema for scheduling rules"""
    max_prep_time_weekdays: int | None = None  # minutes
    max_prep_time_weekends: int | None = None  # minutes
    max_cook_time_weekdays: int | None = None  # minutes
    max_cook_time_weekends: int | None = None  # minutes
    preferred_cooking_days: list[str] = []  # ["sunday", "wednesday"]
    batch_cooking_preference: bool = False
    leftover_tolerance: str = "medium"  # "low", "medium", "high"
    meal_prep_style: str = "daily"  # "daily", "batch", "mixed"


class DietaryRules(BaseModel):
    model_config = {"from_attributes": True}
    """Schema for dietary rules"""
    strict_restrictions: list[str] = []  # Absolutely cannot have
    flexible_restrictions: list[str] = []  # Try to avoid but ok occasionally
    religious_dietary_laws: list[str] = []  # ["kosher", "halal"]
    ethical_choices: list[str] = []  # ["vegetarian", "sustainable", "local"]
    health_conditions: list[
        str
    ] = []  # ["diabetes", "heart-disease", "high-blood-pressure"]
    allergy_severity: dict[str, str] = {}  # {"nuts": "severe", "dairy": "mild"}


class UserPreferencesUpdate(BaseModel):
    """Schema for updating user preferences"""

    food_preferences: dict[str, list[str]] | None = None
    dietary_restrictions: list[str] | None = None
    ingredient_rules: IngredientRules | None = None
    food_type_rules: FoodTypeRules | None = None
    nutritional_rules: NutritionalRules | None = None
    scheduling_rules: SchedulingRules | None = None
    dietary_rules: DietaryRules | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    preferences: UserPreferences | None = None


class User(UserBase):
    model_config = {"from_attributes": True}
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    preferences: UserPreferences


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class UserNotificationPreferences(BaseModel):
    """User's email notification preferences"""

    email_notifications_enabled: bool
    weekly_planning_reminder: bool
    reminder_day_of_week: int  # 0=Monday, 6=Sunday
    reminder_time: time
    timezone: str


class UserNotificationUpdate(BaseModel):
    """Update user's notification preferences"""

    email_notifications_enabled: bool | None = None
    weekly_planning_reminder: bool | None = None
    reminder_day_of_week: int | None = None  # 0=Monday, 6=Sunday
    reminder_time: time | None = None
    timezone: str | None = None
