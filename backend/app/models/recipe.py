from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    JSON,
    ForeignKey,
    Boolean,
    DateTime,
)
from sqlalchemy.orm import relationship
import datetime
from app.db.database import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    instructions = Column(JSON)  # List of instruction steps
    ingredients = Column(JSON)  # List of ingredient objects
    prep_time_minutes = Column(Integer)
    cook_time_minutes = Column(Integer)
    servings = Column(Integer)

    # Use JSON for compatibility with both PostgreSQL and SQLite
    # The migration will convert these to ARRAY in PostgreSQL
    tags = Column(JSON)  # e.g., ["vegetarian", "quick", "healthy"]
    source_urls = Column(JSON)  # URLs if applicable

    cuisine = Column(String, index=True)  # e.g., "Italian", "Mexican"
    difficulty = Column(String)  # "Easy", "Medium", "Hard"
    source = Column(String)  # Where recipe came from

    # Nutrition information
    calories = Column(Float)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    fiber_g = Column(Float)
    sugar_g = Column(Float)
    sodium_mg = Column(Float)

    # Timestamps
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # Note: embedding column will be added by migration in PostgreSQL only

    # Relationships
    user = relationship("User", back_populates="recipes")
    meal_plan_items = relationship("MealPlanItem", back_populates="recipe")
    recipe_feedbacks = relationship(
        "RecipeFeedback", back_populates="recipe", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Recipe(id={self.id}, name='{self.name}', user_id={self.user_id})>"

    def get_tags(self):
        """Get tags as a list, handling both ARRAY and JSON storage"""
        if hasattr(self, "tags") and self.tags:
            return self.tags if isinstance(self.tags, list) else self.tags
        return []

    def set_tags(self, tags_list):
        """Set tags, handling both ARRAY and JSON storage"""
        if hasattr(self, "tags"):
            self.tags = tags_list

    def get_source_urls(self):
        """Get source URLs as a list, handling both ARRAY and JSON storage"""
        if hasattr(self, "source_urls") and self.source_urls:
            return (
                self.source_urls
                if isinstance(self.source_urls, list)
                else self.source_urls
            )
        return []

    def set_source_urls(self, urls_list):
        """Set source URLs, handling both ARRAY and JSON storage"""
        if hasattr(self, "source_urls"):
            self.source_urls = urls_list


class RecipeFeedback(Base):
    __tablename__ = "recipe_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 scale
    feedback_text = Column(Text)
    made_it = Column(Boolean, default=False)  # Did they actually make it?
    would_make_again = Column(Boolean)
    liked = Column(Boolean)  # Did they like it? (separate from rating)
    difficulty_rating = Column(Integer)  # 1-5, how hard was it actually?
    taste_rating = Column(Integer)  # 1-5, how did it taste?

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # Relationships
    user = relationship("User")
    recipe = relationship("Recipe", back_populates="recipe_feedbacks")

    def __repr__(self):
        return f"<RecipeFeedback(id={self.id}, user_id={self.user_id}, recipe_id={self.recipe_id}, rating={self.rating})>"
