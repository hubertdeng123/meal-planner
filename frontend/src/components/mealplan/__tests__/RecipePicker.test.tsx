import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockRecipe } from '../../../test/utils';
import { RecipePicker } from '../RecipePicker';
import type { Recipe } from '../../../types';

vi.mock('../../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

const recipes: Recipe[] = [
  {
    ...mockRecipe,
    id: 1,
    name: 'Slow braised beef',
    prep_time_minutes: 20,
    cook_time_minutes: 180,
    tags: ['comfort'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    ...mockRecipe,
    id: 2,
    name: 'Miso salmon',
    prep_time_minutes: 5,
    cook_time_minutes: 15,
    cuisine: 'japanese',
    tags: ['fish'],
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    ...mockRecipe,
    id: 3,
    name: 'Chickpea curry',
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    tags: ['vegan'],
    created_at: '2026-02-01T00:00:00Z',
  },
];

function names() {
  const list = screen.getByRole('list', { name: 'Recipes' });
  return within(list)
    .getAllByRole('button')
    .map(button => button.textContent ?? '');
}

describe('RecipePicker', () => {
  it('lists recent recipes first and filters by search across name, cuisine and tags', async () => {
    const user = userEvent.setup();
    render(
      <RecipePicker title="Tuesday dinner" recipes={recipes} onSelect={vi.fn()} onClose={vi.fn()} />
    );

    expect(screen.getByRole('dialog', { name: 'Tuesday dinner' })).toBeInTheDocument();
    expect(names()[0]).toMatch(/Miso salmon/);
    expect(names()[2]).toMatch(/Slow braised beef/);

    await user.type(screen.getByLabelText('Search recipes'), 'japanese');
    expect(names()).toHaveLength(1);
    expect(names()[0]).toMatch(/Miso salmon/);

    await user.clear(screen.getByLabelText('Search recipes'));
    await user.type(screen.getByLabelText('Search recipes'), 'zzz');
    expect(screen.getByText('No recipes match')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Make a recipe/ })).toHaveAttribute(
      'href',
      '/generate'
    );
  });

  it('narrows to quick recipes', async () => {
    const user = userEvent.setup();
    render(<RecipePicker title="Lunch" recipes={recipes} onSelect={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Under 30 min/ }));
    expect(screen.getByRole('button', { name: /Under 30 min/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(names()).toHaveLength(2);
    expect(names().join()).not.toMatch(/braised/);
  });

  it('selects a recipe, marks the current one and clears the slot', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClear = vi.fn();
    render(
      <RecipePicker
        title="Dinner"
        recipes={recipes}
        currentRecipeId={3}
        onSelect={onSelect}
        onClear={onClear}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Chickpea curry/ })).toHaveAttribute(
      'aria-current',
      'true'
    );
    await user.click(screen.getByRole('button', { name: /Miso salmon/ }));
    expect(onSelect).toHaveBeenCalledWith(recipes[1]);

    await user.click(screen.getByRole('button', { name: /Clear slot/ }));
    expect(onClear).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RecipePicker title="Dinner" recipes={recipes} onSelect={vi.fn()} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
