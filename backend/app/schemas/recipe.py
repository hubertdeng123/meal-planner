from pydantic import BaseModel
from datetime import datetime


class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str
    notes: str | None = None


class NutritionFacts(BaseModel):
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    fiber_g: float | None = None
    sugar_g: float | None = None
    sodium_mg: float | None = None


class RecipeSuggestion(BaseModel):
    id: int | None = None
    name: str
    description: str
    cuisine: str
    ingredients: list[Ingredient]
    instructions: list[str]
    prep_time: int
    cook_time: int
    servings: int
    difficulty: str
    nutrition: NutritionFacts | None = None
    source_urls: list[str] = []


class RecipeBase(BaseModel):
    name: str
    description: str | None = None
    instructions: list[str]
    ingredients: list[Ingredient]
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int = 4
    tags: list[str] = []


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    instructions: list[str] | None = None
    ingredients: list[Ingredient] | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
    tags: list[str] | None = None


class Recipe(RecipeBase):
    id: int
    user_id: int
    nutrition: NutritionFacts
    source: str
    source_urls: list[str] = []  # Changed from source_url to support multiple sources
    image_url: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecipeFeedbackCreate(BaseModel):
    recipe_id: int
    liked: bool
    rating: int | None = None  # 1-5
    notes: str | None = None


class RecipeFeedback(RecipeFeedbackCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RecipeGenerationRequest(BaseModel):
    meal_type: str | None = None  # breakfast, lunch, dinner, snack
    cuisine: str | None = None
    difficulty: str | None = None  # easy, medium, hard
    max_time_minutes: int | None = None
    ingredients_to_use: list[str] = []
    ingredients_to_avoid: list[str] = []
    dietary_restrictions: list[str] = []
    servings: int = 4
    search_online: bool = True  # Enable web search for recipe inspiration by default
    comments: str | None = None  # Additional notes or special requests for the AI
