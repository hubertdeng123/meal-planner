import type { ReactNode } from 'react';
import { CheckIcon } from './AppIcons';

export interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
}

interface BaseProps {
  label: string;
  hideLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

interface ChoiceChipsProps<T extends string> extends BaseProps {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

interface MultiChoiceChipsProps extends BaseProps {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}

function chipClass(active: boolean, size: 'sm' | 'md') {
  return `chip ${size === 'md' ? 'px-3.5 py-2 text-sm' : ''} ${active ? 'chip-active' : ''} focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft`;
}

function GroupLabel({ label, hideLabel }: { label: string; hideLabel?: boolean }) {
  return <p className={hideLabel ? 'sr-only' : 'label'}>{label}</p>;
}

/** Single-select chip row. Each chip is a toggle button so screen readers hear the state. */
export function ChoiceChips<T extends string>({
  label,
  hideLabel,
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: ChoiceChipsProps<T>) {
  return (
    <div className={className}>
      <GroupLabel label={label} hideLabel={hideLabel} />
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(option => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={chipClass(active, size)}
            >
              {option.label}
              {option.hint && (
                <span className={active ? 'text-primary/70' : 'text-stone-400'}>{option.hint}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MultiChoiceChips({
  label,
  hideLabel,
  options,
  values,
  onChange,
  className = '',
  size = 'sm',
}: MultiChoiceChipsProps) {
  const toggle = (item: string) =>
    onChange(values.includes(item) ? values.filter(value => value !== item) : [...values, item]);

  return (
    <div className={className}>
      <GroupLabel label={label} hideLabel={hideLabel} />
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(item => {
          const active = values.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(item)}
              className={chipClass(active, size)}
            >
              {active && <CheckIcon className="h-3.5 w-3.5" />}
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
