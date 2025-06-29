from sqlalchemy import Column, Integer, String, Date, ForeignKey, JSON, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    checked = Column(Integer, default=0)  # 0 = unchecked, 1 = checked

    # Relationships
    grocery_list = relationship("GroceryList", back_populates="items")
