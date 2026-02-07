import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { render } from '../../test/utils';
import MealPlanDetailPage from '../MealPlanDetailPage';

vi.mock('../../services/mealPlan.service', () => ({
  default: {
    getMealPlan: vi.fn(),
    getMealPlansPaginated: vi.fn(),
    updateMealPlanItem: vi.fn(),
    addMealPlanItem: vi.fn(),
    deleteMealPlanItem: vi.fn(),
    autofill: vi.fn(),
    createGroceryList: vi.fn(),
  },
}));

vi.mock('../../services/recipe.service', () => ({
  default: {
    getRecipes: vi.fn(),
  },
}));

vi.mock('../../services/notification.service', () => ({
  default: {
    sendWeeklyMealPlanNotification: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
  };
});

vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

import mealPlanService from '../../services/mealPlan.service';
import recipeService from '../../services/recipe.service';

const mockMealPlanService = vi.mocked(mealPlanService);
const mockRecipeService = vi.mocked(recipeService);

describe('MealPlanDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows plan health and duplicate warning for repeated recipes', async () => {
    mockMealPlanService.getMealPlan.mockResolvedValue({
      id: 1,
      user_id: 1,
      name: 'Week Plan',
      start_date: '2026-01-05',
      end_date: '2026-01-05',
      created_at: '2026-01-01T00:00:00Z',
      items: [
        {
          id: 11,
          meal_plan_id: 1,
          date: '2026-01-05',
          meal_type: 'breakfast',
          servings: 2,
          recipe_id: 101,
        },
        {
          id: 12,
          meal_plan_id: 1,
          date: '2026-01-05',
          meal_type: 'lunch',
          servings: 2,
          recipe_id: 101,
        },
        {
          id: 13,
          meal_plan_id: 1,
          date: '2026-01-05',
          meal_type: 'dinner',
          servings: 2,
          recipe_id: 101,
        },
      ],
    });

    mockRecipeService.getRecipes.mockResolvedValue([
      {
        id: 101,
        user_id: 1,
        name: 'Quick Pasta',
        description: 'Fast dinner',
        instructions: ['Cook', 'Serve'],
        ingredients: [{ name: 'pasta', quantity: 1, unit: 'box' }],
        prep_time_minutes: 10,
        cook_time_minutes: 12,
        servings: 2,
        tags: ['quick'],
        nutrition: {},
        source: 'test',
        source_urls: [],
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    render(<MealPlanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Plan health')).toBeInTheDocument();
      expect(screen.getAllByText('Repeated 3 times this week.')).toHaveLength(3);
    });
  });
});
