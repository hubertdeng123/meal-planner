import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockRecipe } from '../../test/utils';
import RecipeDetailPage from '../RecipeDetailPage';
import type { Recipe } from '../../types';

vi.mock('../../services/recipe.service', () => ({
  default: {
    getRecipe: vi.fn(),
    getFeedback: vi.fn(),
    addFeedback: vi.fn(),
    deleteRecipe: vi.fn(),
  },
}));

vi.mock('../../services/grocery.service', () => ({
  default: { createGroceryListFromRecipes: vi.fn() },
}));

vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
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

import recipeService from '../../services/recipe.service';
import groceryService from '../../services/grocery.service';

const mocked = vi.mocked(recipeService);
const recipe: Recipe = {
  ...mockRecipe,
  cuisine: 'italian',
  difficulty: 'easy',
  feedback: {
    id: 9,
    user_id: 1,
    recipe_id: 1,
    liked: true,
    rating: 4,
    notes: 'More basil',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getRecipe.mockResolvedValue(recipe);
  });

  it('renders the hero, scaled ingredients and prior feedback', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Test Recipe' })).toBeInTheDocument();
    expect(screen.getByText('Italian · Easy')).toBeInTheDocument();
    expect(screen.getByText('45 min', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByLabelText('Notes for next time')).toHaveValue('More basil');
    expect(screen.getByRole('radio', { name: '4 stars' })).toHaveAttribute('aria-checked', 'true');
    expect(mocked.getFeedback).not.toHaveBeenCalled();

    expect(screen.getByText('100 g')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Increase servings' }));
    await user.click(screen.getByRole('button', { name: 'Increase servings' }));
    await user.click(screen.getByRole('button', { name: 'Increase servings' }));
    await user.click(screen.getByRole('button', { name: 'Increase servings' }));
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText(/Scaled from 4 to 8 servings/)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /tomatoes/ }));
    expect(screen.getByText('1 of 2 gathered')).toBeInTheDocument();
  });

  it('falls back to getFeedback when the recipe has no embedded feedback', async () => {
    const withoutFeedback: Recipe = { ...recipe };
    delete withoutFeedback.feedback;
    mocked.getRecipe.mockResolvedValue(withoutFeedback);
    mocked.getFeedback.mockResolvedValue(null);
    render(<RecipeDetailPage />);

    await screen.findByRole('heading', { name: 'Test Recipe' });
    expect(mocked.getFeedback).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('opens cook mode at the clicked step', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailPage />);
    await screen.findByRole('heading', { name: 'Test Recipe' });

    await user.click(screen.getByRole('button', { name: /Step 2/ }));
    const dialog = screen.getByRole('dialog', { name: 'Cook mode: Test Recipe' });
    expect(within(dialog).getByText('Step 2 of 2')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Exit cook mode' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves updated feedback', async () => {
    const user = userEvent.setup();
    mocked.addFeedback.mockResolvedValue({ ...recipe.feedback!, rating: 5 });
    render(<RecipeDetailPage />);
    await screen.findByRole('heading', { name: 'Test Recipe' });

    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocked.addFeedback).toHaveBeenCalledWith(1, {
      liked: true,
      rating: 5,
      notes: 'More basil',
    });
    expect(await screen.findByText('Saved', { selector: 'span' })).toBeInTheDocument();
  });

  it('builds a grocery list and navigates to it', async () => {
    const user = userEvent.setup();
    vi.mocked(groceryService.createGroceryListFromRecipes).mockResolvedValue({ id: 42 } as never);
    render(<RecipeDetailPage />);
    await screen.findByRole('heading', { name: 'Test Recipe' });

    await user.click(screen.getByRole('button', { name: 'Grocery list' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/grocery/42'));
  });

  it('shows a not-found state for a 404', async () => {
    mocked.getRecipe.mockRejectedValue({ response: { status: 404 } });
    render(<RecipeDetailPage />);
    expect(await screen.findByText("We couldn't find that recipe")).toBeInTheDocument();
  });

  it('shows a retryable error state for other failures', async () => {
    const user = userEvent.setup();
    mocked.getRecipe.mockRejectedValueOnce(new Error('boom'));
    render(<RecipeDetailPage />);

    expect(await screen.findByText("Couldn't load this recipe")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Test Recipe' })).toBeInTheDocument();
  });
});
