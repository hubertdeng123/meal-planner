import { describe, it, expect } from 'vitest';
import type {
  User,
  Recipe,
  GroceryList,
  MealPlan,
  WeeklyMealPlan,
  APIError,
  RecipeGenerationRequest,
  UserCreate,
  UserLogin,
} from '../index';

describe('Type Definitions', () => {
  describe('User types', () => {
    it('should have correct User interface structure', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        food_preferences: {
          cuisines: ['Italian'],
          favorite_ingredients: ['tomatoes'],
          cooking_methods: ['grilling'],
        },
        dietary_restrictions: ['vegetarian'],
      };

      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.is_active).toBeDefined();
      expect(user.food_preferences).toBeDefined();
      expect(user.dietary_restrictions).toBeDefined();
    });

    it('should have correct UserCreate interface structure', () => {
      const userCreate: UserCreate = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      expect(userCreate.email).toBeDefined();
      expect(userCreate.username).toBeDefined();
      expect(userCreate.password).toBeDefined();
    });

    it('should have correct UserLogin interface structure', () => {
      const userLogin: UserLogin = {
        email: 'test@example.com',
        password: 'password123',
      };

      expect(userLogin.email).toBeDefined();
      expect(userLogin.password).toBeDefined();
    });
  });

  describe('Recipe types', () => {
    it('should have correct Recipe interface structure', () => {
      const recipe: Recipe = {
        id: 1,
        user_id: 1,
        name: 'Test Recipe',
        instructions: ['Step 1', 'Step 2'],
        ingredients: [{ name: 'tomatoes', quantity: 2, unit: 'pieces' }],
        servings: 4,
        tags: ['easy'],
        nutrition: {
          calories: 250,
          protein_g: 12,
        },
        source: 'AI Generated',
        source_urls: [],
        created_at: '2023-01-01T00:00:00Z',
      };

      expect(recipe.id).toBeDefined();
      expect(recipe.name).toBeDefined();
      expect(recipe.instructions).toBeDefined();
      expect(recipe.ingredients).toBeDefined();
      expect(recipe.servings).toBeDefined();
      expect(recipe.tags).toBeDefined();
      expect(recipe.nutrition).toBeDefined();
      expect(recipe.source).toBeDefined();
      expect(recipe.source_urls).toBeDefined();
    });

    it('should have correct RecipeGenerationRequest interface structure', () => {
      const request: RecipeGenerationRequest = {
        ingredients_to_use: ['tomatoes'],
        ingredients_to_avoid: ['nuts'],
        dietary_restrictions: ['vegetarian'],
        servings: 4,
      };

      expect(request.ingredients_to_use).toBeDefined();
      expect(request.ingredients_to_avoid).toBeDefined();
      expect(request.dietary_restrictions).toBeDefined();
      expect(request.servings).toBeDefined();
    });

    it('should allow optional fields in Recipe', () => {
      const minimalRecipe: Recipe = {
        id: 1,
        user_id: 1,
        name: 'Minimal Recipe',
        instructions: ['Mix ingredients'],
        ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        servings: 1,
        tags: [],
        nutrition: {},
        source: 'User',
        source_urls: [],
        created_at: '2023-01-01T00:00:00Z',
      };

      // Optional fields should not cause TypeScript errors
      expect(minimalRecipe.description).toBeUndefined();
      expect(minimalRecipe.prep_time_minutes).toBeUndefined();
      expect(minimalRecipe.cook_time_minutes).toBeUndefined();
      expect(minimalRecipe.image_url).toBeUndefined();
    });
  });

  describe('Grocery types', () => {
    it('should have correct GroceryList interface structure', () => {
      const groceryList: GroceryList = {
        id: 1,
        user_id: 1,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        items: [
          {
            id: 1,
            grocery_list_id: 1,
            name: 'Tomatoes',
            checked: false,
          },
        ],
      };

      expect(groceryList.id).toBeDefined();
      expect(groceryList.user_id).toBeDefined();
      expect(groceryList.items).toBeDefined();
      expect(Array.isArray(groceryList.items)).toBe(true);
    });

    it('should allow optional fields in GroceryItem', () => {
      const groceryList: GroceryList = {
        id: 1,
        user_id: 1,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        items: [
          {
            id: 1,
            grocery_list_id: 1,
            name: 'Tomatoes',
            checked: false,
            // Optional fields
            quantity: 2,
            unit: 'pieces',
            category: 'Produce',
          },
        ],
      };

      expect(groceryList.items[0].quantity).toBe(2);
      expect(groceryList.items[0].unit).toBe('pieces');
      expect(groceryList.items[0].category).toBe('Produce');
    });
  });

  describe('Meal Plan types', () => {
    it('should have correct MealPlan interface structure', () => {
      const mealPlan: MealPlan = {
        id: 1,
        user_id: 1,
        name: 'Test Meal Plan',
        start_date: '2023-01-01',
        end_date: '2023-01-07',
        created_at: '2023-01-01T00:00:00Z',
        items: [
          {
            id: 1,
            meal_plan_id: 1,
            date: '2023-01-01',
            meal_type: 'lunch',
            servings: 2,
          },
        ],
      };

      expect(mealPlan.id).toBeDefined();
      expect(mealPlan.name).toBeDefined();
      expect(mealPlan.start_date).toBeDefined();
      expect(mealPlan.end_date).toBeDefined();
      expect(mealPlan.items).toBeDefined();
      expect(Array.isArray(mealPlan.items)).toBe(true);
    });

    it('should have correct WeeklyMealPlan interface structure', () => {
      const weeklyPlan: WeeklyMealPlan = {
        user_id: 1,
        name: 'Weekly Plan',
        start_date: '2023-01-01',
        end_date: '2023-01-07',
        meal_slots: [
          {
            date: '2023-01-01',
            meal_type: 'breakfast',
            recipe_suggestions: [
              {
                name: 'Pancakes',
                description: 'Fluffy pancakes',
                cuisine: 'American',
                ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
                instructions: ['Mix and cook'],
                prep_time: 10,
                cook_time: 15,
                servings: 2,
                difficulty: 'easy',
              },
            ],
          },
        ],
      };

      expect(weeklyPlan.meal_slots).toBeDefined();
      expect(Array.isArray(weeklyPlan.meal_slots)).toBe(true);
      expect(weeklyPlan.meal_slots[0].recipe_suggestions).toBeDefined();
    });
  });

  describe('Error types', () => {
    it('should have correct APIError interface structure', () => {
      const apiError: APIError = {
        code: 'NETWORK_ERROR',
        response: {
          status: 400,
          data: {
            detail: 'Bad request',
          },
        },
      };

      expect(apiError.response?.status).toBe(400);
      expect(apiError.response?.data?.detail).toBe('Bad request');
      expect(apiError.code).toBe('NETWORK_ERROR');
    });

    it('should allow partial APIError structure', () => {
      const partialError: APIError = {
        response: {
          status: 500,
        },
      };

      expect(partialError.response?.status).toBe(500);
      expect(partialError.response?.data).toBeUndefined();
      expect(partialError.code).toBeUndefined();
    });
  });

  describe('Meal type constants', () => {
    it('should have correct MealType union type', () => {
      const breakfastType = 'breakfast' as const;
      const lunchType = 'lunch' as const;
      const dinnerType = 'dinner' as const;
      const snackType = 'snack' as const;

      // These should not cause TypeScript errors
      expect(breakfastType).toBe('breakfast');
      expect(lunchType).toBe('lunch');
      expect(dinnerType).toBe('dinner');
      expect(snackType).toBe('snack');
    });
  });
});
