import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';
import MealPlansPage from '../MealPlansPage';
import type { MealPlanList } from '../../types';
import { addDaysIso, getWeekRange } from '../../utils/date';

vi.mock('../../services/mealPlan.service', () => ({
  default: {
    getMealPlansPaginated: vi.fn(),
    createMealPlan: vi.fn(),
    deleteMealPlan: vi.fn(),
  },
}));
vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import mealPlanService from '../../services/mealPlan.service';
const mocked = vi.mocked(mealPlanService);

const week = getWeekRange();
const plan = (overrides: Partial<MealPlanList>): MealPlanList => ({
  id: 1,
  name: 'Plan',
  start_date: week.start_date,
  end_date: week.end_date,
  created_at: '2026-01-01T00:00:00Z',
  item_count: 0,
  ...overrides,
});

function page(items: MealPlanList[], total_pages = 1) {
  return { items, total: items.length, page: 1, page_size: 12, total_pages };
}

describe('MealPlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('features the current week and groups the rest', async () => {
    mocked.getMealPlansPaginated.mockResolvedValue(
      page([
        plan({
          id: 3,
          name: 'Next up',
          start_date: addDaysIso(week.start_date, 7),
          end_date: addDaysIso(week.end_date, 7),
        }),
        plan({ id: 2, name: 'Busy week', item_count: 7 }),
        plan({
          id: 1,
          name: 'Old week',
          start_date: addDaysIso(week.start_date, -7),
          end_date: addDaysIso(week.end_date, -7),
          item_count: 21,
        }),
      ])
    );
    render(<MealPlansPage />);

    const current = await screen.findByRole('link', { name: /Busy week/ });
    expect(current).toHaveAttribute('href', '/meal-plans/2');
    expect(within(current).getByText('7 of 21 meals')).toBeInTheDocument();

    const upcoming = screen.getByRole('region', { name: 'Coming up' });
    expect(within(upcoming).getByText('Next up')).toBeInTheDocument();
    const past = screen.getByRole('region', { name: 'Past weeks' });
    expect(within(past).getByText('21/21')).toBeInTheDocument();
    expect(mocked.getMealPlansPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, sort: 'start_date', order: 'desc' })
    );
  });

  it('starts this week in one tap when nothing is planned', async () => {
    const user = userEvent.setup();
    mocked.getMealPlansPaginated.mockResolvedValue(page([]));
    mocked.createMealPlan.mockResolvedValue({ id: 9 } as never);
    render(<MealPlansPage />);

    await user.click(await screen.findByRole('button', { name: 'Plan this week' }));
    expect(mocked.createMealPlan).toHaveBeenCalledWith(
      expect.objectContaining({ start_date: week.start_date, end_date: week.end_date })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/meal-plans/9'));
  });

  it('creates next week from the dialog and validates custom dates', async () => {
    const user = userEvent.setup();
    mocked.getMealPlansPaginated.mockResolvedValue(page([]));
    mocked.createMealPlan.mockResolvedValue({ id: 10 } as never);
    render(<MealPlansPage />);

    await user.click(await screen.findByRole('button', { name: /Plan a week/ }));
    const dialog = screen.getByRole('dialog', { name: 'Plan a week' });
    await user.click(within(dialog).getByRole('button', { name: /Custom dates/ }));
    await user.clear(within(dialog).getByLabelText('End'));
    await user.type(within(dialog).getByLabelText('End'), '2000-01-01');
    expect(within(dialog).getByRole('alert')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Start planning' })).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: /Next week/ }));
    await user.type(within(dialog).getByLabelText(/Name/), 'Holiday');
    await user.click(within(dialog).getByRole('button', { name: 'Start planning' }));

    expect(mocked.createMealPlan).toHaveBeenCalledWith({
      name: 'Holiday',
      start_date: addDaysIso(week.start_date, 7),
      end_date: addDaysIso(week.end_date, 7),
    });
  });

  it('loads older plans on demand', async () => {
    const user = userEvent.setup();
    mocked.getMealPlansPaginated
      .mockResolvedValueOnce(page([plan({ id: 2, name: 'Busy week' })], 2))
      .mockResolvedValueOnce(
        page(
          [
            plan({
              id: 1,
              name: 'Ancient week',
              start_date: '2025-01-06',
              end_date: '2025-01-12',
            }),
          ],
          2
        )
      );
    render(<MealPlansPage />);

    await user.click(await screen.findByRole('button', { name: 'Show older plans' }));
    expect(await screen.findByText('Ancient week')).toBeInTheDocument();
    expect(screen.getByText('Busy week')).toBeInTheDocument();
    expect(mocked.getMealPlansPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  it('shows a retryable error', async () => {
    const user = userEvent.setup();
    mocked.getMealPlansPaginated.mockRejectedValueOnce(new Error('x')).mockResolvedValue(page([]));
    render(<MealPlansPage />);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Plan your first week')).toBeInTheDocument();
  });
});
