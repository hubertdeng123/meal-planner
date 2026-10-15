import type { ReactNode } from 'react';
import { MinusIcon, PlusIcon } from './AppIcons';

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md';
  format?: (value: number) => ReactNode;
  className?: string;
}

export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  size = 'md',
  format,
  className = '',
}: StepperProps) {
  const isSmall = size === 'sm';
  const buttonClass = `inline-flex items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-900/5 hover:text-stone-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft disabled:pointer-events-none disabled:opacity-35 ${
    isSmall ? 'h-7 w-7' : 'h-9 w-9'
  }`;

  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 rounded-xl border border-stone-200 bg-white p-0.5 shadow-xs ${className}`}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <MinusIcon className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
      <output
        aria-live="polite"
        className={`text-center font-semibold tabular-nums text-stone-900 ${
          isSmall ? 'min-w-[1.75rem] text-xs' : 'min-w-[2.5rem] text-sm'
        }`}
      >
        {format ? format(value) : value}
      </output>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <PlusIcon className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  );
}
