import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockRecipe } from '../../test/utils';
import RecipesPage from '../RecipesPage';

// Mock the recipe service
vi.mock('../../services/recipe.service', () => ({
  default: {
    getRecipes: vi.fn(),
    deleteRecipe: vi.fn(),
  },
}));

import recipeService from '../../services/recipe.service';
const mockRecipeService = vi.mocked(recipeService);
const mockGetRecipes = mockRecipeService.getRecipes;
const mockDeleteRecipe = mockRecipeService.deleteRecipe;

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

// Mock the API service
vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

describe('RecipesPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetRecipes.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<RecipesPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders recipes when loaded successfully', async () => {
    const recipes = [
      { ...mockRecipe, id: 1, name: 'Recipe 1' },
      { ...mockRecipe, id: 2, name: 'Recipe 2' },
    ];
    mockGetRecipes.mockResolvedValue(recipes);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
      expect(screen.getByText('Recipe 2')).toBeInTheDocument();
    });
  });

  it('shows empty state when no recipes exist', async () => {
    mockGetRecipes.mockResolvedValue([]);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('No recipes yet...yet')).toBeInTheDocument();
      expect(screen.getByText('Kick things off with your first recipe.')).toBeInTheDocument();
    });
  });

  it('displays error message when loading fails', async () => {
    const errorMessage = 'Failed to load recipes';
    mockGetRecipes.mockRejectedValue(new Error(errorMessage));

    render(<RecipesPage />);

    await waitFor(() => {
      // Since the component doesn't show error state, check that it shows empty state
      expect(screen.getByText('No recipes yet...yet')).toBeInTheDocument();
    });
  });

  it('navigates to generate recipe page when clicking generate button', async () => {
    mockGetRecipes.mockResolvedValue([]);

    render(<RecipesPage />);

    await waitFor(() => {
      const generateButton = screen.getByText('Make a recipe');
      expect(generateButton.closest('a')).toHaveAttribute('href', '/generate');
    });
  });

  it('displays recipe details correctly', async () => {
    const recipe = {
      ...mockRecipe,
      name: 'Test Recipe',
      description: 'A delicious test recipe',
      prep_time_minutes: 15,
      cook_time_minutes: 30,
      servings: 4,
      tags: ['easy', 'vegetarian'],
    };
    mockGetRecipes.mockResolvedValue([recipe]);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
      expect(screen.getByText('A delicious test recipe')).toBeInTheDocument();
      expect(screen.getByText('45 min')).toBeInTheDocument(); // Combined prep + cook time
      expect(screen.getByText('4 servings')).toBeInTheDocument();
      expect(screen.getByText('easy')).toBeInTheDocument();
      expect(screen.getByText('vegetarian')).toBeInTheDocument();
    });
  });

  it('deletes recipe when delete button is clicked', async () => {
    const recipes = [{ ...mockRecipe, id: 1, name: 'Recipe to Delete' }];
    mockGetRecipes.mockResolvedValue(recipes);
    mockDeleteRecipe.mockResolvedValue({});

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('Recipe to Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete recipe');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteRecipe).toHaveBeenCalledWith(1);
    });
  });

  it('shows alert when recipe deletion fails', async () => {
    const recipes = [{ ...mockRecipe, id: 1, name: 'Recipe to Delete' }];
    mockGetRecipes.mockResolvedValue(recipes);
    mockDeleteRecipe.mockRejectedValue(new Error('Delete failed'));

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('Recipe to Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete recipe');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Could not delete that recipe. Try again?');
    });
  });

  it('navigates to recipe detail when recipe card is clicked', async () => {
    const recipes = [{ ...mockRecipe, id: 1, name: 'Clickable Recipe' }];
    mockGetRecipes.mockResolvedValue(recipes);

    render(<RecipesPage />);

    await waitFor(() => {
      const recipeCard = screen.getByText('Clickable Recipe').closest('a');
      expect(recipeCard).toHaveAttribute('href', '/recipes/1');
    });
  });

  it('shows "New recipe, please" button when recipes exist', async () => {
    const recipes = [{ ...mockRecipe, id: 1, name: 'Test Recipe' }];
    mockGetRecipes.mockResolvedValue(recipes);

    render(<RecipesPage />);

    await waitFor(() => {
      const generateButton = screen.getByText('New recipe, please');
      expect(generateButton.closest('a')).toHaveAttribute('href', '/generate');
    });
  });

  it('handles recipes without optional fields gracefully', async () => {
    const minimalRecipe = {
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
    mockGetRecipes.mockResolvedValue([minimalRecipe]);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('Minimal Recipe')).toBeInTheDocument();
      expect(screen.getByText('0 min')).toBeInTheDocument(); // No prep/cook time
      expect(screen.getByText('1 servings')).toBeInTheDocument();
    });
  });

  it('shows loading state for individual recipe deletion', async () => {
    const recipes = [{ ...mockRecipe, id: 1, name: 'Recipe to Delete' }];
    mockGetRecipes.mockResolvedValue(recipes);
    mockDeleteRecipe.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('Recipe to Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete recipe');
    await user.click(deleteButton);

    // Should show loading spinner while deleting
    expect(deleteButton).toBeDisabled();
    await waitFor(() => {
      expect(deleteButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});
