import { useId } from 'react';

interface PreferenceNumberInputProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  unit?: string;
  min?: number;
  hint?: string;
}

export function PreferenceNumberInput({
  label,
  value,
  onChange,
  placeholder,
  unit,
  min = 0,
  hint,
}: PreferenceNumberInputProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={event => {
            const next = Number.parseInt(event.target.value, 10);
            onChange(Number.isFinite(next) && next >= min ? next : undefined);
          }}
          className={`input ${unit ? 'pr-14' : ''}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="helper-text">{hint}</p>}
    </div>
  );
}
