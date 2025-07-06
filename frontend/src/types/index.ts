export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  food_preferences: FoodPreferences;
  dietary_restrictions: string[];
  ingredient_rules: IngredientRules;
  food_type_rules: FoodTypeRules;
  nutritional_rules: NutritionalRules;
  scheduling_rules: SchedulingRules;
  dietary_rules: DietaryRules;
}

export interface FoodPreferences {
  cuisines: string[];
  favorite_ingredients: string[];
  cooking_methods: string[];
  preferred_spice_level?: 'none' | 'mild' | 'medium' | 'hot' | 'very_hot';
  flavor_profiles?: string[];
  loved_ingredients?: string[];
  disliked_ingredients?: string[];
}

export interface IngredientRules {
  must_include: Array<{ ingredient: string; reason: string }>;
  must_avoid: Array<{ ingredient: string; reason: string }>;
  preferred: Array<{ ingredient: string; reason: string }>;
  disliked: Array<{ ingredient: string; reason: string }>;
}

export interface FoodTypeRules {
  protein_preferences: string[];
  protein_frequency: Record<string, number>;
  cooking_methods_preferred: string[];
  cooking_methods_avoided: string[];
  meal_complexity_preference: 'simple' | 'medium' | 'complex';
  cuisine_rotation: Record<string, number>;
}

export interface NutritionalRules {
  daily_calorie_target?: number;
  daily_calorie_range?: { min: number; max: number };
  macro_targets?: { protein_g?: number; carbs_g?: number; fat_g?: number };
  max_sodium_mg?: number;
  min_fiber_g?: number;
  max_sugar_g?: number;
  special_nutritional_needs: string[];
}

export interface SchedulingRules {
  max_prep_time_weekdays?: number;
  max_prep_time_weekends?: number;
  max_cook_time_weekdays?: number;
  max_cook_time_weekends?: number;
  preferred_cooking_days: string[];
  batch_cooking_preference: boolean;
  leftover_tolerance: 'low' | 'medium' | 'high';
  meal_prep_style: 'daily' | 'batch' | 'mixed';
}

export interface DietaryRules {
  strict_restrictions: string[];
  flexible_restrictions: string[];
  religious_dietary_laws: string[];
  ethical_choices: string[];
  health_conditions: string[];
  allergy_severity: Record<string, 'mild' | 'moderate' | 'severe'>;
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
  ingredient_rules: IngredientRules;
  food_type_rules: FoodTypeRules;
  nutritional_rules: NutritionalRules;
  scheduling_rules: SchedulingRules;
  dietary_rules: DietaryRules;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  food_preferences?: FoodPreferences;
  dietary_restrictions?: string[];
  ingredient_rules?: IngredientRules;
  food_type_rules?: FoodTypeRules;
  nutritional_rules?: NutritionalRules;
  scheduling_rules?: SchedulingRules;
  dietary_rules?: DietaryRules;
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
  source_urls: string[];
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
export type PrepTimePreference = 'quick' | 'moderate' | 'relaxed';

export interface RecipeSuggestion {
  id?: number;
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
  theme?: string;
  description?: string;
  occasion?: string;
  budget_target?: number;
  prep_time_preference?: PrepTimePreference;
  special_notes?: Record<string, string | number | boolean | null>;
  week_dietary_restrictions?: string[];
  week_food_preferences?: Record<string, string[]>;
}

export interface WeeklyMealPlan {
  id?: number;
  user_id: number;
  name: string;
  start_date: string;
  end_date: string;
  meal_slots: MealSlot[];
  created_at?: string;
  description?: string;
  theme?: string;
  occasion?: string;
  budget_target?: number;
  prep_time_preference?: string;
  special_notes?: Record<string, string | number | boolean | null>;
  week_dietary_restrictions?: string[];
  week_food_preferences?: Record<string, string[]>;
}

export interface MealPlan {
  id: number;
  user_id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  items: MealPlanItem[];
  description?: string;
  theme?: string;
  occasion?: string;
  budget_target?: number;
  prep_time_preference?: string;
  special_notes?: Record<string, string | number | boolean | null>;
  week_dietary_restrictions?: string[];
  week_food_preferences?: Record<string, string[]>;
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
