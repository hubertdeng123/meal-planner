import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContextProvider';

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock data helpers
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  food_preferences: {
    cuisines: ['Italian', 'Mexican'],
    favorite_ingredients: ['tomatoes', 'cheese'],
    cooking_methods: ['grilling', 'baking'],
  },
  dietary_restrictions: ['vegetarian'],
};

export const mockRecipe = {
  id: 1,
  user_id: 1,
  name: 'Test Recipe',
  description: 'A test recipe',
  instructions: ['Step 1', 'Step 2'],
  ingredients: [
    { name: 'tomatoes', quantity: 2, unit: 'pieces' },
    { name: 'cheese', quantity: 100, unit: 'g' },
  ],
  prep_time_minutes: 15,
  cook_time_minutes: 30,
  servings: 4,
  tags: ['easy', 'vegetarian'],
  nutrition: {
    calories: 250,
    protein_g: 12,
    carbs_g: 25,
    fat_g: 10,
  },
  source: 'AI Generated',
  source_urls: [],
  created_at: '2023-01-01T00:00:00Z',
};

export const mockGroceryList = {
  id: 1,
  user_id: 1,
  meal_plan_id: 1,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  items: [
    {
      id: 1,
      grocery_list_id: 1,
      name: 'Tomatoes',
      quantity: 2,
      unit: 'pieces',
      category: 'Produce',
      checked: false,
    },
    {
      id: 2,
      grocery_list_id: 1,
      name: 'Cheese',
      quantity: 100,
      unit: 'g',
      category: 'Dairy',
      checked: true,
    },
  ],
};

export const mockMealPlan = {
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
      recipe_id: 1,
      date: '2023-01-01',
      meal_type: 'lunch' as const,
      servings: 2,
      recipe: mockRecipe,
    },
  ],
};
