import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockRecipe } from '../../test/utils';
import RecipesPage from '../RecipesPage';

// Mock the recipe service
const mockGetRecipes = vi.fn();
const mockDeleteRecipe = vi.fn();
vi.mock('../../services/recipe.service', () => ({
  default: {
    getRecipes: mockGetRecipes,
    deleteRecipe: mockDeleteRecipe,
  },
}));

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

// Mock alert
global.alert = vi.fn();
global.confirm = vi.fn(() => true);

describe('RecipesPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetRecipes.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<RecipesPage />);

    expect(screen.getByText('Loading recipes...')).toBeInTheDocument();
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
      expect(screen.getByText('No recipes found')).toBeInTheDocument();
      expect(screen.getByText('Start creating your recipe collection!')).toBeInTheDocument();
    });
  });

  it('displays error message when loading fails', async () => {
    const errorMessage = 'Failed to load recipes';
    mockGetRecipes.mockRejectedValue(new Error(errorMessage));

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading recipes/i)).toBeInTheDocument();
    });
  });

  it('navigates to generate recipe page when clicking generate button', async () => {
    mockGetRecipes.mockResolvedValue([]);

    render(<RecipesPage />);

    await waitFor(() => {
      const generateButton = screen.getByText('Generate New Recipe');
      expect(generateButton.closest('a')).toHaveAttribute('href', '/generate-recipe');
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
      expect(screen.getByText('15 min prep')).toBeInTheDocument();
      expect(screen.getByText('30 min cook')).toBeInTheDocument();
      expect(screen.getByText('4 servings')).toBeInTheDocument();
      expect(screen.getByText('easy')).toBeInTheDocument();
      expect(screen.getByText('vegetarian')).toBeInTheDocument();
    });
  });

  it('deletes recipe when delete button is clicked and confirmed', async () => {
    const recipes = [{ ...mockRecipe, id: 1, name: 'Recipe to Delete' }];
    mockGetRecipes.mockResolvedValue(recipes);
    mockDeleteRecipe.mockResolvedValue({});

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('Recipe to Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete recipe');
    await user.click(deleteButton);

    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this recipe?');
    expect(mockDeleteRecipe).toHaveBeenCalledWith(1);
  });

  it('does not delete recipe when deletion is cancelled', async () => {
    const recipes = [{ ...mockRecipe, id: 1, name: 'Recipe to Delete' }];
    mockGetRecipes.mockResolvedValue(recipes);
    global.confirm = vi.fn(() => false); // User cancels

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('Recipe to Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete recipe');
    await user.click(deleteButton);

    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this recipe?');
    expect(mockDeleteRecipe).not.toHaveBeenCalled();
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
      expect(global.alert).toHaveBeenCalledWith('Failed to delete recipe. Please try again.');
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

  it('formats nutrition information correctly', async () => {
    const recipe = {
      ...mockRecipe,
      nutrition: {
        calories: 350,
        protein_g: 25,
        carbs_g: 30,
        fat_g: 15,
      },
    };
    mockGetRecipes.mockResolvedValue([recipe]);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText('350 calories')).toBeInTheDocument();
      expect(screen.getByText('25g protein')).toBeInTheDocument();
      expect(screen.getByText('30g carbs')).toBeInTheDocument();
      expect(screen.getByText('15g fat')).toBeInTheDocument();
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
      // Should not crash when optional fields are missing
    });
  });
});
