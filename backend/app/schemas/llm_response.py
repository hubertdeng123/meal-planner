"""
Pydantic schemas for LLM responses using Together API structured outputs.

These schemas define the expected structure of JSON responses from the LLM,
which are then converted to our internal data models.
"""

from pydantic import BaseModel, Field


class IngredientLLM(BaseModel):
    """Ingredient format expected from LLM"""

    name: str = Field(description="Ingredient name")
    quantity: float = Field(description="Quantity as decimal number")
    unit: str = Field(description="Unit of measurement")
    notes: str | None = Field(default=None, description="Optional preparation notes")


class NutritionLLM(BaseModel):
    """Nutrition information from LLM"""

    calories: int = Field(description="Calories per serving")
    protein_g: float = Field(description="Protein in grams")
    carbs_g: float = Field(description="Carbohydrates in grams")
    fat_g: float = Field(description="Fat in grams")
    fiber_g: float | None = Field(default=None, description="Fiber in grams")
    sugar_g: float | None = Field(default=None, description="Sugar in grams")
    sodium_mg: int | None = Field(default=None, description="Sodium in milligrams")


class RecipeLLM(BaseModel):
    """Recipe format expected from LLM"""

    name: str = Field(description="Recipe name")
    description: str = Field(description="Brief recipe description")
    cuisine: str = Field(description="Cuisine type (e.g., Italian, Mexican, Thai)")
    ingredients: list[IngredientLLM] = Field(description="List of ingredients")
    instructions: list[str] = Field(description="Step-by-step cooking instructions")
    prep_time_minutes: int = Field(description="Preparation time in minutes")
    cook_time_minutes: int = Field(description="Cooking time in minutes")
    servings: int = Field(description="Number of servings")
    tags: list[str] = Field(default_factory=list, description="Recipe tags/categories")
    nutrition: NutritionLLM = Field(description="Nutritional information")
    source_urls: list[str] = Field(
        default_factory=list, description="Source URLs if any"
    )
