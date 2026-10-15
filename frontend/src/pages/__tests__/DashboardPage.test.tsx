import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockRecipe } from '../../test/utils';
import DashboardPage from '../DashboardPage';
import type { DashboardSummary, MealPlan } from '../../types';
import { addDaysIso, getWeekRange, todayIso } from '../../utils/date';

vi.mock('../../services/dashboard.service', () => ({
  default: { getDashboardSummary: vi.fn() },
}));
vi.mock('../../services/mealPlan.service', () => ({
  default: { getMealPlan: vi.fn() },
}));
vi.mock('../../services/recipe.service', () => ({
  default: { getRecipe: vi.fn() },
}));
vi.mock('../../services/auth.service', () => ({
  default: {
    getCurrentUser: vi.fn().mockResolvedValue({ username: 'sam' }),
    isAuthenticated: vi.fn(() => true),
  },
}));
vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

import dashboardService from '../../services/dashboard.service';
import mealPlanService from '../../services/mealPlan.service';
import recipeService from '../../services/recipe.service';

const week = getWeekRange();

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    today_brief: {
      headline: 'Plan dinner tonight',
      subline: 'Two open slots left.',
      primary_action: { label: 'Open plan', href: '/meal-plans/7' },
    },
    action_queue: [
      {
        id: 'plan_gap',
        title: 'Fill remaining meal plan slots',
        rationale: '2 open slots.',
        impact: 'high',
        cta: { label: 'Complete', href: '/meal-plans/7' },
      },
      {
        id: 'grocery_progress',
        title: 'Finish your current shopping list',
        rationale: '3 of 5 items unchecked.',
        impact: 'medium',
        cta: { label: 'Resume', href: '/grocery/3' },
      },
    ],
    plan_continuity: {
      active_plan_id: 7,
      completion_percent: 33,
      open_slots: 14,
      next_slots: [],
    },
    pantry_risk: {
      expiring_3d_count: 1,
      top_items: [{ name: 'Spinach', expires_at: addDaysIso(todayIso(), 1) }],
      cta: { label: 'Generate with expiring items', href: '/generate?use=Spinach' },
    },
    recent_context: {
      recent_recipes: [{ id: 5, name: 'Lemon orzo', total_minutes: 25, tags: [] }],
      recent_grocery_list: { id: 3, unchecked_count: 3, href: '/grocery/3' },
    },
    ...overrides,
  };
}

const plan: MealPlan = {
  id: 7,
  user_id: 1,
  name: 'Busy week',
  start_date: week.start_date,
  end_date: week.end_date,
  created_at: '2026-01-01T00:00:00Z',
  items: [
    {
      id: 1,
      meal_plan_id: 7,
      date: todayIso(),
      meal_type: 'dinner',
      servings: 2,
      recipe_id: 1,
    },
  ],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardService.getDashboardSummary).mockResolvedValue(summary());
    vi.mocked(mealPlanService.getMealPlan).mockResolvedValue(plan);
    vi.mocked(recipeService.getRecipe).mockResolvedValue({ ...mockRecipe, total_minutes: 45 });
  });

  it("leads with tonight's planned dinner and the week strip", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("Tonight's dinner")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Test Recipe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get cooking/ })).toHaveAttribute('href', '/recipes/1');
    expect(recipeService.getRecipe).toHaveBeenCalledWith(1);

    expect(screen.getByRole('heading', { name: 'Busy week' })).toBeInTheDocument();
    expect(screen.getByText('33% planned')).toBeInTheDocument();
    const today = screen
      .getAllByRole('listitem')
      .find(li => li.getAttribute('aria-current') === 'date');
    expect(today).toHaveAccessibleName(/1 of 3 meals planned/);
    expect(await screen.findByText(/sam/)).toBeInTheDocument();
  });

  it('dedupes the next-up list against the headline action and offers pantry cooking', async () => {
    render(<DashboardPage />);
    await screen.findByText("Tonight's dinner");

    expect(screen.queryByText('Fill remaining meal plan slots')).not.toBeInTheDocument();
    expect(screen.getByText('Finish your current shopping list')).toBeInTheDocument();
    expect(screen.getByText('Spinach')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cook with these/ })).toHaveAttribute(
      'href',
      '/generate?use=Spinach'
    );
    expect(screen.getByRole('link', { name: /Resume shopping/ })).toHaveAttribute(
      'href',
      '/grocery/3'
    );
  });

  it('falls back to the brief when nothing is planned for tonight', async () => {
    vi.mocked(dashboardService.getDashboardSummary).mockResolvedValue(
      summary({
        plan_continuity: {
          active_plan_id: null,
          completion_percent: 0,
          open_slots: 0,
          next_slots: [],
        },
        recent_context: { recent_recipes: [], recent_grocery_list: null },
      })
    );
    render(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Plan dinner tonight' })).toBeInTheDocument();
    expect(mealPlanService.getMealPlan).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /Plan the week/ })).toHaveAttribute(
      'href',
      '/meal-plans'
    );
    expect(screen.getByRole('link', { name: 'Make your first recipe' })).toBeInTheDocument();
  });

  it('shows a retryable error state', async () => {
    const user = userEvent.setup();
    vi.mocked(dashboardService.getDashboardSummary).mockRejectedValueOnce(new Error('down'));
    render(<DashboardPage />);

    expect(await screen.findByText("Couldn't load your day")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText("Tonight's dinner")).toBeInTheDocument();
  });
});
