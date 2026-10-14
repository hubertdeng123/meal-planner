import { useId, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { PlusIcon, XMarkIcon } from './AppIcons';

type ChipTone = 'primary' | 'danger';

interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  tone?: ChipTone;
  suggestions?: string[];
  suggestionsLabel?: string;
  disabled?: boolean;
  hint?: string;
}

const toneStyles: Record<ChipTone, string> = {
  primary: 'bg-primary-soft text-primary-ink',
  danger: 'bg-red-50 text-red-700',
};

function mergeValues(current: string[], incoming: string[]): string[] {
  const seen = new Set(current.map(value => value.toLowerCase()));
  const next = [...current];
  for (const raw of incoming) {
    const value = raw.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    next.push(value);
  }
  return next;
}

export function ChipInput({
  label,
  values,
  onChange,
  placeholder = 'Type and press Enter',
  tone = 'primary',
  suggestions = [],
  suggestionsLabel = 'Suggestions',
  disabled = false,
  hint,
}: ChipInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const parts = raw.split(',');
    if (parts.every(part => !part.trim())) return;
    onChange(mergeValues(values, parts));
    setDraft('');
  };

  const remove = (value: string) => onChange(values.filter(item => item !== value));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Backspace' && !draft && values.length > 0) {
      remove(values[values.length - 1]);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (!text.includes(',')) return;
    event.preventDefault();
    commit(text);
  };

  const lowerValues = new Set(values.map(value => value.toLowerCase()));
  const openSuggestions = suggestions.filter(item => !lowerValues.has(item.toLowerCase()));

  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <div
        className={`flex min-h-[2.875rem] flex-wrap items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2 py-1.5 shadow-xs transition-colors focus-within:border-primary focus-within:shadow-glow-primary ${
          disabled ? 'opacity-60' : 'hover:border-stone-300'
        }`}
      >
        {values.map(value => (
          <span
            key={value}
            className={`inline-flex items-center gap-1 rounded-lg py-1 pl-2.5 pr-1 text-sm font-medium animate-scale-in ${toneStyles[tone]}`}
          >
            <span>{value}</span>
            <button
              type="button"
              onClick={() => remove(value)}
              disabled={disabled}
              className="rounded-md p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100"
              aria-label={`Remove ${value}`}
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          disabled={disabled}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => commit(draft)}
          placeholder={values.length === 0 ? placeholder : 'Add another'}
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1.5 py-1 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0"
          enterKeyHint="done"
          autoComplete="off"
        />
      </div>
      {hint && <p className="helper-text">{hint}</p>}
      {openSuggestions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-stone-500">{suggestionsLabel}</span>
          {openSuggestions.map(item => (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onChange(mergeValues(values, [item]))}
              className="chip border-dashed"
              aria-label={`Add ${item}`}
            >
              <PlusIcon className="h-3 w-3 text-stone-400" />
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
