import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { render, mockRecipe } from '../../test/utils';
import GenerateRecipePage from '../GenerateRecipePage';
import type { RecipeStreamState } from '../../types';

const streamControls = {
  start: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
};

let streamState: RecipeStreamState = {
  stage: 'idle',
  thinking: '',
  draft: null,
  recipe: null,
  error: null,
  elapsedMs: 0,
};

vi.mock('../../hooks/useRecipeStream', () => ({
  useRecipeStream: () => ({ ...streamState, ...streamControls }),
}));

vi.mock('../../services/pantry.service', () => ({
  default: {
    getPantryItems: vi.fn().mockResolvedValue({
      items: [],
      page: 1,
      page_size: 8,
      total: 0,
      total_pages: 0,
    }),
  },
}));

vi.mock('../../services/grocery.service', () => ({
  default: { createGroceryListFromRecipes: vi.fn() },
}));

vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

function setStream(patch: Partial<RecipeStreamState>) {
  streamState = { ...streamState, ...patch };
}

describe('GenerateRecipePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamState = {
      stage: 'idle',
      thinking: '',
      draft: null,
      recipe: null,
      error: null,
      elapsedMs: 0,
    };
    window.history.pushState({}, '', '/generate');
  });

  it('prefills ingredients_to_use from pantry query params', async () => {
    window.history.pushState({}, '', '/generate?use=spinach&use=tomato');

    render(<GenerateRecipePage />);

    await waitFor(() => {
      expect(screen.getByText('spinach')).toBeInTheDocument();
      expect(screen.getByText('tomato')).toBeInTheDocument();
    });
  });

  it('submits the brief as a normalized generation request', async () => {
    const user = userEvent.setup();
    render(<GenerateRecipePage />);

    await user.click(screen.getByRole('button', { name: 'Dinner' }));
    await user.click(screen.getByRole('button', { name: '30 min' }));
    await user.click(screen.getByRole('button', { name: 'Increase servings' }));
    await user.type(screen.getByLabelText('Must use'), 'leeks{Enter}');
    await user.click(screen.getByRole('button', { name: /Make my recipe/ }));

    expect(streamControls.start).toHaveBeenCalledWith(
      expect.objectContaining({
        meal_type: 'dinner',
        cuisine: undefined,
        max_time_minutes: 30,
        servings: 5,
        ingredients_to_use: ['leeks'],
      })
    );
  });

  it('assembles the recipe live from the streamed draft and can be stopped', async () => {
    const user = userEvent.setup();
    setStream({
      stage: 'drafting',
      thinking: 'Leeks love butter.',
      elapsedMs: 4200,
      draft: {
        name: 'Buttered Leek Pasta',
        ingredients: [{ name: 'leeks', quantity: 2, unit: '' }, { name: 'butter' }],
        instructions: ['Slice the leeks.'],
      },
    });

    render(<GenerateRecipePage />);

    expect(screen.getByRole('heading', { name: 'Buttered Leek Pasta' })).toBeInTheDocument();
    expect(screen.getByText('leeks')).toBeInTheDocument();
    expect(screen.getByText('Slice the leeks.')).toBeInTheDocument();
    expect(screen.getByText('Leeks love butter.')).toBeInTheDocument();
    expect(screen.getByText('0:04', { exact: false })).toBeInTheDocument();
    const activeStep = screen
      .getByRole('list', { name: 'Generation progress' })
      .querySelector('[aria-current="step"]');
    expect(activeStep).toHaveTextContent('Writing the recipe');

    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(streamControls.cancel).toHaveBeenCalled();
    expect(streamControls.reset).toHaveBeenCalled();
  });

  it('shows next steps instead of redirecting when the recipe is saved', async () => {
    const user = userEvent.setup();
    setStream({ stage: 'complete', recipe: { ...mockRecipe, id: 42, name: 'Saved Supper' } });

    render(<GenerateRecipePage />);

    const finish = screen.getByText("What's next?").closest('div.surface') as HTMLElement;
    expect(within(finish).getByRole('link', { name: /Open recipe/ })).toHaveAttribute(
      'href',
      '/recipes/42'
    );
    expect(within(finish).getByRole('button', { name: /Add to plan/ })).toBeInTheDocument();
    expect(within(finish).getByRole('button', { name: /Grocery list/ })).toBeInTheDocument();

    await user.click(within(finish).getByRole('button', { name: /Make another/ }));
    expect(streamControls.reset).toHaveBeenCalled();
  });

  it('offers a retry for retryable errors', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GenerateRecipePage />);
    await user.click(screen.getByRole('button', { name: /Make my recipe/ }));
    expect(streamControls.start).toHaveBeenCalledTimes(1);

    setStream({ stage: 'error', error: { message: 'The kitchen timed out.', retryable: true } });
    rerender(<GenerateRecipePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('The kitchen timed out.');
    await user.click(screen.getByRole('button', { name: /Try again/ }));
    expect(streamControls.start).toHaveBeenCalledTimes(2);
  });
});
