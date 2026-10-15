import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';
import GroceryListDetailPage from '../GroceryListDetailPage';
import type { GroceryItem, GroceryList } from '../../types';

vi.mock('../../services/grocery.service', () => ({
  default: {
    getGroceryList: vi.fn(),
    toggleGroceryItem: vi.fn(),
    updateGroceryItem: vi.fn(),
    addGroceryItem: vi.fn(),
    deleteGroceryItem: vi.fn(),
    deleteGroceryList: vi.fn(),
  },
}));
vi.mock('../../services/notification.service', () => ({
  default: { sendGroceryNotification: vi.fn() },
}));
vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: '4' }) };
});

import groceryService from '../../services/grocery.service';
import notificationService from '../../services/notification.service';
const mocked = vi.mocked(groceryService);

const item = (id: number, name: string, category: string, checked = false): GroceryItem => ({
  id,
  grocery_list_id: 4,
  name,
  category,
  checked,
  quantity: 2,
  unit: 'lb',
});

const list = (items: GroceryItem[]): GroceryList => ({
  id: 4,
  user_id: 1,
  name: 'Sunday shop',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  items,
});

describe('GroceryListDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getGroceryList.mockResolvedValue(
      list([
        item(1, 'Kale', 'Produce'),
        item(2, 'Chicken', 'Meat & Seafood'),
        item(3, 'Rice', 'Pantry', true),
      ])
    );
  });

  it('groups unchecked items by aisle and tucks checked items into the cart', async () => {
    const user = userEvent.setup();
    render(<GroceryListDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Sunday shop' })).toBeInTheDocument();
    const produce = screen.getByRole('region', { name: /Produce/ });
    expect(within(produce).getByRole('checkbox', { name: /Kale/ })).not.toBeChecked();
    expect(screen.getByRole('progressbar', { name: 'Shopping progress' })).toHaveAttribute(
      'aria-valuenow',
      '1'
    );

    expect(screen.queryByRole('checkbox', { name: /Rice/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /In the cart \(1\)/ }));
    expect(screen.getByRole('checkbox', { name: /Rice/ })).toBeChecked();
  });

  it('checks items optimistically and shows the completion state', async () => {
    const user = userEvent.setup();
    mocked.toggleGroceryItem.mockImplementation(async (_list, id, checked) => ({
      ...item(id, id === 1 ? 'Kale' : 'Chicken', id === 1 ? 'Produce' : 'Meat & Seafood'),
      checked,
    }));
    render(<GroceryListDetailPage />);

    await user.click(await screen.findByRole('checkbox', { name: /Kale/ }));
    expect(mocked.toggleGroceryItem).toHaveBeenCalledWith(4, 1, true);
    await user.click(screen.getByRole('checkbox', { name: /Chicken/ }));

    expect(await screen.findByText("Everything's in the cart")).toBeInTheDocument();
  });

  it('rolls back a toggle that fails to save', async () => {
    const user = userEvent.setup();
    mocked.toggleGroceryItem.mockRejectedValue(new Error('offline'));
    render(<GroceryListDetailPage />);

    await user.click(await screen.findByRole('checkbox', { name: /Kale/ }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Kale/ })).not.toBeChecked());
  });

  it('quick-adds a parsed item with Enter', async () => {
    const user = userEvent.setup();
    mocked.addGroceryItem.mockResolvedValue(item(9, 'chicken thighs', 'Other'));
    render(<GroceryListDetailPage />);

    const input = await screen.findByLabelText('Add an item');
    await user.type(input, '2 lb chicken thighs{Enter}');

    expect(mocked.addGroceryItem).toHaveBeenCalledWith(4, {
      name: 'chicken thighs',
      quantity: 2,
      unit: 'lb',
    });
    expect(await screen.findByRole('checkbox', { name: /chicken thighs/ })).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('edits an item inline', async () => {
    const user = userEvent.setup();
    mocked.updateGroceryItem.mockResolvedValue({ ...item(1, 'Baby kale', 'Produce'), quantity: 1 });
    render(<GroceryListDetailPage />);

    await user.click(await screen.findByRole('button', { name: 'Edit Kale' }));
    const form = screen.getByRole('form', { name: 'Edit Kale' });
    await user.clear(within(form).getByLabelText('Item name'));
    await user.type(within(form).getByLabelText('Item name'), 'Baby kale');
    await user.clear(within(form).getByLabelText('Quantity'));
    await user.type(within(form).getByLabelText('Quantity'), '1');
    await user.click(within(form).getByRole('button', { name: 'Save' }));

    expect(mocked.updateGroceryItem).toHaveBeenCalledWith(4, 1, {
      name: 'Baby kale',
      quantity: 1,
      unit: 'lb',
      category: 'Produce',
    });
    expect(await screen.findByRole('checkbox', { name: /Baby kale/ })).toBeInTheDocument();
  });

  it('emails the list to extra people from the overflow menu', async () => {
    const user = userEvent.setup();
    vi.mocked(notificationService.sendGroceryNotification).mockResolvedValue({
      detail: 'Sent.',
      sent_to: ['me@x.com', 'sam@x.com'],
      total_sent: 2,
    });
    render(<GroceryListDetailPage />);

    await user.click(await screen.findByRole('button', { name: 'List actions' }));
    await user.click(screen.getByRole('menuitem', { name: /Email this list/ }));
    const dialog = screen.getByRole('dialog', { name: 'Email this list' });
    await user.type(within(dialog).getByLabelText('Also send to'), 'bad{Enter}');
    expect(within(dialog).getByRole('alert')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Remove bad' }));
    await user.type(within(dialog).getByLabelText('Also send to'), 'sam@x.com{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Send to 2 people' }));

    expect(notificationService.sendGroceryNotification).toHaveBeenCalledWith(4, ['sam@x.com']);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows not found for a missing list', async () => {
    mocked.getGroceryList.mockRejectedValue({ response: { status: 404 } });
    render(<GroceryListDetailPage />);
    expect(await screen.findByText("We couldn't find that list")).toBeInTheDocument();
  });
});
