import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IngredientChecklist } from '../IngredientChecklist';

const ingredients = [
  { name: 'flour', quantity: 1.5, unit: 'cups' },
  { name: 'eggs', quantity: 2, unit: '', notes: 'room temperature' },
  { name: 'salt', quantity: 0, unit: 'to taste' },
];

describe('IngredientChecklist', () => {
  it('renders kitchen-friendly scaled amounts', () => {
    render(
      <IngredientChecklist
        ingredients={ingredients}
        checked={new Set()}
        onToggle={vi.fn()}
        scale={0.5}
      />
    );
    expect(screen.getByText('¾ cups')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('to taste')).toBeInTheDocument();
    expect(screen.getByText(', room temperature')).toBeInTheDocument();
  });

  it('reports toggles by index and reflects checked state', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <IngredientChecklist ingredients={ingredients} checked={new Set([0])} onToggle={onToggle} />
    );

    expect(screen.getByRole('checkbox', { name: /flour/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /eggs/ })).not.toBeChecked();

    await user.click(screen.getByText('eggs'));
    expect(onToggle).toHaveBeenCalledWith(1);
  });
});
