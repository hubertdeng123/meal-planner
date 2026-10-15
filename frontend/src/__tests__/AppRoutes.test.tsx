import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '../App';
import { KitchenSubNav } from '../components/ui/KitchenSubNav';
import RecipeDetailPage from '../pages/RecipeDetailPage';
import { AuthProvider } from '../contexts/AuthContextProvider';
import { ToastProvider } from '../contexts/ToastContext';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'chef', email: 'chef@example.com' },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
}));

vi.mock('../pages/DashboardPage', () => ({
  default: () => <div data-testid="page-dashboard">Dashboard Page</div>,
}));
vi.mock('../pages/RecipesPage', () => ({
  default: () => <div data-testid="page-recipes">Recipes Page</div>,
}));
vi.mock('../pages/GenerateRecipePage', () => ({
  default: () => <div data-testid="page-generate">Generate Recipe Page</div>,
}));
vi.mock('../pages/MealPlansPage', () => ({
  default: () => <div data-testid="page-meal-plans">Meal Plans Page</div>,
}));
vi.mock('../pages/GroceryListsPage', () => ({
  default: () => <div data-testid="page-grocery">Grocery Lists Page</div>,
}));
vi.mock('../pages/PantryPage', () => ({
  default: () => <div data-testid="page-pantry">Pantry Page</div>,
}));
vi.mock('../pages/SettingsPage', () => ({
  default: () => <div data-testid="page-settings">Settings Page</div>,
}));

vi.mock('../services/recipe.service', () => ({
  default: {
    getRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    createFeedback: vi.fn(),
    getRecipeFeedback: vi.fn(),
  },
}));

vi.mock('../services/grocery.service', () => ({
  default: {
    createGroceryList: vi.fn(),
  },
}));

vi.mock('../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

import recipeService from '../services/recipe.service';
const mockRecipeService = vi.mocked(recipeService);

describe('App Route Redirects & Accessibility Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  const redirectCases: Array<{ from: string; testId: string }> = [
    { from: '/home', testId: 'page-dashboard' },
    { from: '/recipes/new', testId: 'page-generate' },
    { from: '/recipes/generate', testId: 'page-generate' },
    { from: '/planner', testId: 'page-meal-plans' },
    { from: '/shopping', testId: 'page-grocery' },
    { from: '/grocery-lists', testId: 'page-grocery' },
    { from: '/inventory', testId: 'page-pantry' },
    { from: '/preferences', testId: 'page-settings' },
    { from: '/profile', testId: 'page-settings' },
    { from: '/unknown-legacy-route', testId: 'page-dashboard' },
  ];

  it.each(redirectCases)('redirects legacy route $from to $testId', async ({ from, testId }) => {
    window.history.pushState({}, '', from);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  });

  it('renders KitchenSubNav with aria-current="page" and count badges', () => {
    render(
      <MemoryRouter initialEntries={['/pantry']}>
        <KitchenSubNav groceryCount={3} pantryCount={14} expiringCount={2} />
      </MemoryRouter>
    );

    const region = screen.getByRole('region', { name: 'Kitchen and Shop switcher' });
    expect(region).toBeInTheDocument();

    const groceryLink = screen.getByRole('link', { name: /Grocery Lists/i });
    const pantryLink = screen.getByRole('link', { name: /Pantry Inventory/i });

    expect(groceryLink).not.toHaveAttribute('aria-current');
    expect(pantryLink).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('2 expiring')).toBeInTheDocument();
  });

  it('supports interactive recipe serving scaling and ingredient checkboxes on RecipeDetailPage', async () => {
    mockRecipeService.getRecipe.mockResolvedValue({
      id: 42,
      user_id: 1,
      name: 'Herbed Lemon Orzo',
      description: 'Bright weeknight pasta dish',
      prep_time_minutes: 10,
      cook_time_minutes: 15,
      servings: 2,
      tags: ['vegetarian', 'quick'],
      ingredients: [
        { name: 'Orzo pasta', quantity: 1.5, unit: 'cup', category: 'Pantry' },
        { name: 'Garlic cloves', quantity: 2, unit: 'cloves', category: 'Produce' },
      ],
      instructions: ['Boil salted water and cook orzo.', 'Toss with lemon and herbs.'],
      nutrition: { calories: 420, protein_g: 12, carbs_g: 68, fat_g: 9 },
      source: 'AI Chef',
      source_urls: [],
      created_at: '2026-01-15T12:00:00Z',
    });
    mockRecipeService.getRecipeFeedback.mockResolvedValue([]);

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/recipes/42']}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Herbed Lemon Orzo' })).toBeInTheDocument();
    });

    // Initial 2 servings: 1.5 -> 1.5 cup
    expect(screen.getByText(/1\.5 cup/i)).toBeInTheDocument();

    // Scale up to 4 servings (2x)
    const increaseBtn = screen.getByRole('button', { name: 'Increase servings' });
    await user.click(increaseBtn);
    await user.click(increaseBtn);

    expect(screen.getByText(/3 cup/i)).toBeInTheDocument();
    expect(screen.getByText(/4 cloves/i)).toBeInTheDocument();

    // Reset button appears when scaled
    const resetBtn = screen.getByRole('button', { name: 'Reset' });
    await user.click(resetBtn);
    expect(screen.getByText(/1\.5 cup/i)).toBeInTheDocument();
  });
});
