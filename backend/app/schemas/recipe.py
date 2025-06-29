from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str
    notes: Optional[str] = None


class NutritionFacts(BaseModel):
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None


class RecipeBase(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: List[str]
    ingredients: List[Ingredient]
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: int = 4
    tags: List[str] = []


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[List[str]] = None
    ingredients: Optional[List[Ingredient]] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    tags: Optional[List[str]] = None


class Recipe(RecipeBase):
    id: int
    user_id: int
    nutrition: NutritionFacts
    source: str
    source_urls: List[str] = []  # Changed from source_url to support multiple sources
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecipeFeedbackCreate(BaseModel):
    recipe_id: int
    liked: bool
    rating: Optional[int] = None  # 1-5
    notes: Optional[str] = None


class RecipeFeedback(RecipeFeedbackCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RecipeGenerationRequest(BaseModel):
    meal_type: Optional[str] = None  # breakfast, lunch, dinner, snack
    cuisine: Optional[str] = None
    difficulty: Optional[str] = None  # easy, medium, hard
    max_time_minutes: Optional[int] = None
    ingredients_to_use: List[str] = []
    ingredients_to_avoid: List[str] = []
    dietary_restrictions: List[str] = []
    servings: int = 4
    search_online: bool = True  # Enable web search for recipe inspiration by default
    comments: Optional[str] = None  # Additional notes or special requests for the AI
