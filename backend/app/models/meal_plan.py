from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Date,
    ForeignKey,
    JSON,
    DateTime,
    Float,
    Text,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Enhanced contextual fields
    description = Column(Text, nullable=True)  # Additional context about the meal plan
    theme = Column(
        String, nullable=True
    )  # e.g., "Italian Week", "Quick & Easy", "Healthy Reset"
    occasion = Column(String, nullable=True)  # Special occasion or event context
    budget_target = Column(Float, nullable=True)  # Optional budget constraints
    prep_time_preference = Column(
        String, nullable=True
    )  # Overall prep time preference for the week
    special_notes = Column(JSON, default=dict)  # Flexible contextual information

    # Week-specific preferences that can override user defaults
    week_dietary_restrictions = Column(
        JSON, default=list
    )  # Additional restrictions for this week
    week_food_preferences = Column(
        JSON, default=dict
    )  # Temporary preferences for this week

    # Relationships
    user = relationship("User", back_populates="meal_plans")
    items = relationship(
        "MealPlanItem", back_populates="meal_plan", cascade="all, delete-orphan"
    )
    grocery_lists = relationship("GroceryList", back_populates="meal_plan")


class MealPlanItem(Base):
    __tablename__ = "meal_plan_items"

    id = Column(Integer, primary_key=True, index=True)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"))
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=True)
    date = Column(Date, nullable=False)
    meal_type = Column(String)  # breakfast, lunch, dinner, snack
    servings = Column(Integer, default=1)
    recipe_data = Column(JSON, nullable=True)  # Store AI-generated recipe data

    # Relationships
    meal_plan = relationship("MealPlan", back_populates="items")
    recipe = relationship("Recipe", back_populates="meal_plan_items")


class GroceryList(Base):
    __tablename__ = "grocery_lists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"), nullable=True)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="grocery_lists")
    meal_plan = relationship("MealPlan", back_populates="grocery_lists")
    items = relationship(
        "GroceryItem", back_populates="grocery_list", cascade="all, delete-orphan"
    )


class GroceryItem(Base):
    __tablename__ = "grocery_items"

    id = Column(Integer, primary_key=True, index=True)
    grocery_list_id = Column(Integer, ForeignKey("grocery_lists.id"))
    name = Column(String, nullable=False)
    quantity = Column(Float)
    unit = Column(String)
    category = Column(String)  # produce, dairy, meat, etc.
    checked = Column(Boolean, default=False, nullable=False)

    # Relationships
    grocery_list = relationship("GroceryList", back_populates="items")
