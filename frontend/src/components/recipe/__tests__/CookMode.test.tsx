import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookMode } from '../CookMode';

const steps = ['Boil the pasta.', 'Fry the garlic.', 'Toss together.'];
const ingredients = [
  { name: 'spaghetti', quantity: 200, unit: 'g' },
  { name: 'garlic', quantity: 3, unit: 'cloves' },
];

function Harness(props: { initialStep?: number; onClose?: () => void; onFinish?: () => void }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return (
    <CookMode
      title="Garlic pasta"
      steps={steps}
      ingredients={ingredients}
      checked={checked}
      onToggleIngredient={index =>
        setChecked(current => {
          const next = new Set(current);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
        })
      }
      scale={2}
      onClose={props.onClose ?? vi.fn()}
      onFinish={props.onFinish}
      initialStep={props.initialStep}
    />
  );
}

describe('CookMode', () => {
  it('shows one step at a time and moves with the arrow keys', () => {
    render(<Harness />);
    expect(screen.getByRole('dialog', { name: 'Cook mode: Garlic pasta' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Boil the pasta.')).toBeInTheDocument();
    expect(screen.queryByText('Fry the garlic.')).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Fry the garlic.')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
  });

  it('starts at the requested step and jumps via the progress segments', async () => {
    const user = userEvent.setup();
    render(<Harness initialStep={1} />);
    expect(screen.getByText('Fry the garlic.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go to step 3' }));
    expect(screen.getByText('Toss together.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to step 3' })).toHaveAttribute(
      'aria-current',
      'step'
    );
  });

  it('finishes on the last step and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onFinish = vi.fn();
    render(<Harness initialStep={2} onClose={onClose} onFinish={onFinish} />);

    await user.click(screen.getByRole('button', { name: /Done cooking/ }));
    expect(onFinish).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows scaled ingredients that can be checked off', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const toggle = screen.getByRole('button', { name: /Ingredients/ });
    expect(toggle).toHaveTextContent('0/2');
    await user.click(toggle);

    expect(screen.getByText('400 g')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /garlic/ }));
    expect(toggle).toHaveTextContent('1/2');
  });

  it('locks body scroll while open', () => {
    const { unmount } = render(<Harness />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
