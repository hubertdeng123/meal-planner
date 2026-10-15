import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { render } from '../../test/utils';
import { addDaysIso, todayIso } from '../../utils/date';
import PantryPage from '../PantryPage';

vi.mock('../../services/pantry.service', () => ({
  default: {
    getPantryItems: vi.fn(),
    createPantryItem: vi.fn(),
    updatePantryItem: vi.fn(),
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

  describe('kitchen actions', () => {
    const base = {
      user_id: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    beforeEach(() => {
      mockPantryService.getPantryItems.mockResolvedValue({
        items: [
          {
            ...base,
            id: 1,
            name: 'Feta',
            category: 'Dairy',
            expires_at: addDaysIso(todayIso(), -2),
          },
          { ...base, id: 2, name: 'Red onion', quantity: 3, expires_at: addDaysIso(todayIso(), 1) },
          { ...base, id: 3, name: 'Lentils', quantity: 1, unit: 'kg' },
        ],
        page: 1,
        page_size: 24,
        total: 3,
        total_pages: 1,
      });
    });

    it('shows expiry as a clear state and summarises what needs using', async () => {
      render(<PantryPage />);

      expect(await screen.findByText('Expired 2 days ago')).toBeInTheDocument();
      expect(screen.getByText('Use by tomorrow')).toBeInTheDocument();
      expect(screen.getByText('No expiry date')).toBeInTheDocument();
      expect(screen.getByText('1 expired')).toBeInTheDocument();
      expect(screen.getByText('1 to use in the next 3 days')).toBeInTheDocument();
      expect(screen.getByText('1 kg')).toBeInTheDocument();
    });

    it('cooks with several selected items', async () => {
      const user = userEvent.setup();
      render(<PantryPage />);

      await user.click(await screen.findByRole('checkbox', { name: 'Select Feta' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select Red onion' }));
      const bar = screen.getByRole('region', { name: 'Selected pantry items' });
      expect(within(bar).getByText('2 selected')).toBeInTheDocument();

      await user.click(within(bar).getByRole('button', { name: /Cook with these/ }));
      expect(mockNavigate).toHaveBeenCalledWith('/generate?use=Feta,Red%20onion');
    });

    it('quick-adds an item with a parsed amount and expiry', async () => {
      const user = userEvent.setup();
      mockPantryService.createPantryItem.mockResolvedValue({
        ...base,
        id: 9,
        name: 'chickpeas',
        quantity: 2,
        unit: 'cans',
      });
      render(<PantryPage />);

      await screen.findByText('Lentils');
      await user.selectOptions(screen.getByLabelText('Keeps for'), '7');
      await user.type(screen.getByLabelText('Add to pantry'), '2 cans chickpeas{Enter}');

      expect(mockPantryService.createPantryItem).toHaveBeenCalledWith({
        name: 'chickpeas',
        quantity: 2,
        unit: 'cans',
        expires_at: addDaysIso(todayIso(), 7),
      });
      expect(await screen.findByText('chickpeas')).toBeInTheDocument();
    });
  });
});
