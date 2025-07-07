from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Time
from sqlalchemy.orm import relationship
from datetime import datetime, time
from app.db.database import Base
from app.schemas.user import (
    FoodPreferences,
    IngredientRules,
    FoodTypeRules,
    NutritionalRules,
    SchedulingRules,
    DietaryRules,
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # User preferences as JSON
    food_preferences = Column(JSON, default=dict)
    dietary_restrictions = Column(JSON, default=list)

    # Enhanced rule preferences
    ingredient_rules = Column(
        JSON, default=dict
    )  # Must include/avoid ingredients with reasons
    food_type_rules = Column(
        JSON, default=dict
    )  # Preferences for protein types, cooking methods, etc.
    nutritional_rules = Column(JSON, default=dict)  # Calorie targets, macro preferences
    scheduling_rules = Column(
        JSON, default=dict
    )  # Meal timing preferences, prep time constraints
    dietary_rules = Column(
        JSON, default=dict
    )  # Detailed dietary restrictions and preferences

    # Email notification preferences
    email_notifications_enabled = Column(Boolean, default=True)
    weekly_planning_reminder = Column(Boolean, default=True)
    reminder_day_of_week = Column(Integer, default=0)  # 0=Monday, 6=Sunday
    reminder_time = Column(Time, default=time(9, 0))  # 9:00 AM
    timezone = Column(String, default="UTC")

    # Relationships
    recipes = relationship("Recipe", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")
    grocery_lists = relationship("GroceryList", back_populates="user")
    recipe_feedback = relationship("RecipeFeedback", back_populates="user")

    @property
    def preferences(self):
        """Returns a Pydantic-compatible UserPreferences object"""
        return {
            "food_preferences": FoodPreferences.model_validate(
                self.food_preferences or {}
            ),
            "dietary_restrictions": self.dietary_restrictions or [],
            "ingredient_rules": IngredientRules.model_validate(
                self.ingredient_rules or {}
            ),
            "food_type_rules": FoodTypeRules.model_validate(self.food_type_rules or {}),
            "nutritional_rules": NutritionalRules.model_validate(
                self.nutritional_rules or {}
            ),
            "scheduling_rules": SchedulingRules.model_validate(
                self.scheduling_rules or {}
            ),
            "dietary_rules": DietaryRules.model_validate(self.dietary_rules or {}),
        }
