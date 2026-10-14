import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChipInput } from '../ChipInput';

function Harness({
  initial = [],
  suggestions,
  onChange,
}: {
  initial?: string[];
  suggestions?: string[];
  onChange?: (values: string[]) => void;
}) {
  const [values, setValues] = useState(initial);
  return (
    <ChipInput
      label="Must use"
      values={values}
      suggestions={suggestions}
      onChange={next => {
        setValues(next);
        onChange?.(next);
      }}
    />
  );
}

describe('ChipInput', () => {
  it('adds a chip on Enter and on comma, ignoring case-insensitive duplicates', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByLabelText('Must use');

    await user.type(input, 'Leeks{Enter}');
    await user.type(input, 'feta,');
    await user.type(input, 'LEEKS{Enter}');

    expect(screen.getByRole('button', { name: 'Remove Leeks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove feta' })).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(['Leeks', 'feta']);
    expect(input).toHaveValue('');
  });

  it('removes the last chip with Backspace on an empty input and via the remove button', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['rice', 'beans', 'corn']} />);
    const input = screen.getByLabelText('Must use');

    await user.click(input);
    await user.keyboard('{Backspace}');
    expect(screen.queryByRole('button', { name: 'Remove corn' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove rice' }));
    expect(screen.queryByRole('button', { name: 'Remove rice' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove beans' })).toBeInTheDocument();
  });

  it('splits pasted comma-separated text into chips', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByLabelText('Must use'));
    await user.paste('spinach, eggs ,  , lemon');

    expect(screen.getByRole('button', { name: 'Remove spinach' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove eggs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove lemon' })).toBeInTheDocument();
  });

  it('offers suggestions that are not already chosen', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['Spinach']} suggestions={['spinach', 'Yogurt']} />);

    expect(screen.queryByRole('button', { name: 'Add spinach' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add Yogurt' }));

    expect(screen.getByRole('button', { name: 'Remove Yogurt' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Yogurt' })).not.toBeInTheDocument();
  });

  it('commits the pending text on blur', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Must use'), 'chickpeas');
    await user.tab();

    expect(screen.getByRole('button', { name: 'Remove chickpeas' })).toBeInTheDocument();
  });
});
