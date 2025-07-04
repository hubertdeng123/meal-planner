export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  food_preferences: FoodPreferences;
  dietary_restrictions: string[];
}

export interface FoodPreferences {
  cuisines: string[];
  favorite_ingredients: string[];
  cooking_methods: string[];
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserPreferences {
  food_preferences: FoodPreferences;
  dietary_restrictions: string[];
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Recipe {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  instructions: string[];
  ingredients: Ingredient[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings: number;
  tags: string[];
  nutrition: NutritionFacts;
  source: string;
  source_urls: string[]; // Changed from source_url to support multiple sources
  image_url?: string;
  created_at: string;
}

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface NutritionFacts {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface RecipeGenerationRequest {
  meal_type?: string;
  cuisine?: string;
  difficulty?: string;
  max_time_minutes?: number;
  ingredients_to_use: string[];
  ingredients_to_avoid: string[];
  dietary_restrictions: string[];
  servings: number;
  search_online?: boolean;
  comments?: string;
}

export interface RecipeFeedback {
  recipe_id: number;
  liked: boolean;
  rating?: number;
  notes?: string;
}

export interface GroceryItem {
  id: number;
  grocery_list_id: number;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  checked: boolean;
}

export interface GroceryItemCreate {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

export interface GroceryItemUpdate {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  checked?: boolean;
}

export interface GroceryList {
  id: number;
  user_id: number;
  meal_plan_id?: number;
  created_at: string;
  updated_at: string;
  items: GroceryItem[];
}

export interface GroceryListCreate {
  meal_plan_id?: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface RecipeSuggestion {
  id?: number; // Optional ID for saved recipes
  name: string;
  description: string;
  cuisine: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: string;
  nutrition?: {
    calories: number;
  };
}

export interface MealSlot {
  date: string;
  meal_type: MealType;
  recipe_suggestions: RecipeSuggestion[];
  selected_recipe_index?: number;
  selected_recipe?: RecipeSuggestion;
}

export interface WeeklyScheduleRequest {
  start_date: string;
  cooking_days: string[];
  meal_types: MealType[];
  servings: number;
  difficulty?: string;
  dietary_restrictions?: string[];
  preferred_cuisines?: string[];
  must_include_ingredients?: string[];
  must_avoid_ingredients?: string[];
}

export interface WeeklyMealPlan {
  id?: number;
  user_id: number;
  name: string;
  start_date: string;
  end_date: string;
  meal_slots: MealSlot[];
  created_at?: string;
}

export interface MealPlan {
  id: number;
  user_id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  items: MealPlanItem[];
}

export interface MealPlanItem {
  id: number;
  meal_plan_id: number;
  recipe_id?: number;
  date: string;
  meal_type: MealType;
  servings: number;
  recipe_data?: RecipeSuggestion;
  recipe?: Recipe;
}

export interface RecipeSelectionRequest {
  meal_plan_id: number;
  meal_slot_date: string;
  meal_type: MealType;
  selected_recipe_index: number;
}

export interface APIError {
  code?: string;
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
}
