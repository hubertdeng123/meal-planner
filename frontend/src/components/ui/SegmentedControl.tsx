import type { ReactNode } from 'react';

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  stretch?: boolean;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className = '',
  stretch = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`segmented ${stretch ? 'flex w-full' : ''} ${className}`}
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`segmented-item whitespace-nowrap ${stretch ? 'flex-1' : ''} ${
              active ? 'segmented-item-active' : ''
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
