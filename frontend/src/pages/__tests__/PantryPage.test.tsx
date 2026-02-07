import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { render } from '../../test/utils';
import PantryPage from '../PantryPage';

vi.mock('../../services/pantry.service', () => ({
  default: {
    getPantryItems: vi.fn(),
    createPantryItem: vi.fn(),
    deletePantryItem: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

import pantryService from '../../services/pantry.service';

const mockPantryService = vi.mocked(pantryService);

describe('PantryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters to expiring items and supports pantry-to-generate handoff', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString();

    mockPantryService.getPantryItems.mockResolvedValue({
      items: [
        {
          id: 1,
          user_id: 1,
          name: 'Spinach',
          quantity: 1,
          unit: 'bag',
          category: 'Produce',
          expires_at: tomorrowIso,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_id: 1,
          name: 'Rice',
          quantity: 2,
          unit: 'lb',
          category: 'Pantry',
          expires_at: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      page: 1,
      page_size: 12,
      total: 2,
      total_pages: 1,
    });

    const user = userEvent.setup();
    render(<PantryPage />);

    await waitFor(() => {
      expect(screen.getByText('Spinach')).toBeInTheDocument();
      expect(screen.getByText('Rice')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Use soon' }));
    expect(screen.getByText('Spinach')).toBeInTheDocument();
    expect(screen.queryByText('Rice')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockPantryService.getPantryItems).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: 'expires_at',
          order: 'asc',
          page: 1,
        })
      );
    });

    await user.click(screen.getByRole('button', { name: 'Recently updated' }));
    await waitFor(() => {
      expect(mockPantryService.getPantryItems).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: 'updated_at',
          order: 'desc',
          page: 1,
        })
      );
    });

    await user.click(screen.getByRole('button', { name: 'Expiry order' }));
    await waitFor(() => {
      expect(mockPantryService.getPantryItems).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: 'expires_at',
          order: 'asc',
          page: 1,
        })
      );
    });
    expect(screen.getByText('Rice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use soon' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Expiry order' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const spinachCard = screen.getByText('Spinach').closest('.card');
    expect(spinachCard).not.toBeNull();
    await user.click(
      within(spinachCard as HTMLElement).getByRole('button', { name: 'Use in recipe' })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/generate?use=Spinach');
  });
});
