import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockRecipe } from '../../test/utils';
import GroceryListsPage from '../GroceryListsPage';
import type { GroceryList } from '../../types';
import { getWeekRange } from '../../utils/date';

vi.mock('../../services/grocery.service', () => ({
  default: {
    getGroceryListsPaginated: vi.fn(),
    createGroceryListFromRecipes: vi.fn(),
    createGroceryList: vi.fn(),
    deleteGroceryList: vi.fn(),
  },
}));
vi.mock('../../services/mealPlan.service', () => ({
  default: { getMealPlansPaginated: vi.fn(), createGroceryList: vi.fn() },
}));
vi.mock('../../services/recipe.service', () => ({
  default: { getRecipes: vi.fn() },
}));
vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import groceryService from '../../services/grocery.service';
import mealPlanService from '../../services/mealPlan.service';
import recipeService from '../../services/recipe.service';

const week = getWeekRange();
const lists: GroceryList[] = [
  {
    id: 1,
    user_id: 1,
    name: 'Weeknight shop',
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    items: [
      { id: 1, grocery_list_id: 1, name: 'Kale', category: 'Produce', checked: false },
      { id: 2, grocery_list_id: 1, name: 'Rice', category: 'Pantry', checked: true },
    ],
  },
  {
    id: 2,
    user_id: 1,
    name: 'Last trip',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    items: [{ id: 3, grocery_list_id: 2, name: 'Milk', category: 'Dairy', checked: true }],
  },
];

describe('GroceryListsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(groceryService.getGroceryListsPaginated).mockResolvedValue({
      items: lists,
      page: 1,
      page_size: 12,
      total: 2,
      total_pages: 1,
    });
    vi.mocked(mealPlanService.getMealPlansPaginated).mockResolvedValue({
      items: [
        {
          id: 7,
          name: 'This week',
          start_date: week.start_date,
          end_date: week.end_date,
          created_at: '2026-01-01T00:00:00Z',
          item_count: 5,
        },
      ],
      page: 1,
      page_size: 10,
      total: 1,
      total_pages: 1,
    });
    vi.mocked(recipeService.getRecipes).mockResolvedValue([mockRecipe]);
  });

  it('separates lists still to shop from finished ones', async () => {
    render(<GroceryListsPage />);

    const toShop = await screen.findByRole('region', { name: 'To shop' });
    expect(within(toShop).getByText('Weeknight shop')).toBeInTheDocument();
    expect(within(toShop).getByText('1 of 2 left · Produce')).toBeInTheDocument();
    const done = screen.getByRole('region', { name: 'Done' });
    expect(within(done).getByText('All 1 items in the cart')).toBeInTheDocument();
  });

  it('builds a list from the current meal plan by default', async () => {
    const user = userEvent.setup();
    vi.mocked(mealPlanService.createGroceryList).mockResolvedValue({ id: 30 } as never);
    render(<GroceryListsPage />);

    await user.click(await screen.findByRole('button', { name: /New list/ }));
    const dialog = screen.getByRole('dialog', { name: 'New grocery list' });
    expect(await within(dialog).findByRole('radio', { name: /This week/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Build list' }));

    expect(mealPlanService.createGroceryList).toHaveBeenCalledWith(7);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/grocery/30'));
  });

  it('builds a list from selected recipes', async () => {
    const user = userEvent.setup();
    vi.mocked(groceryService.createGroceryListFromRecipes).mockResolvedValue({ id: 31 } as never);
    render(<GroceryListsPage />);

    await user.click(await screen.findByRole('button', { name: /New list/ }));
    const dialog = screen.getByRole('dialog', { name: 'New grocery list' });
    await within(dialog).findByRole('radio', { name: /This week/ });
    await user.click(within(dialog).getByRole('button', { name: 'Recipes' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Test Recipe' }));
    await user.click(within(dialog).getByRole('button', { name: 'Build from 1 recipe' }));

    expect(groceryService.createGroceryListFromRecipes).toHaveBeenCalledWith([1]);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/grocery/31'));
  });

  it('shows an empty state with a way in', async () => {
    vi.mocked(groceryService.getGroceryListsPaginated).mockResolvedValue({
      items: [],
      page: 1,
      page_size: 12,
      total: 0,
      total_pages: 0,
    });
    render(<GroceryListsPage />);
    expect(await screen.findByText('No grocery lists yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to meal plans' })).toHaveAttribute(
      'href',
      '/meal-plans'
    );
  });
});
