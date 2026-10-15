import type { ReactNode } from 'react';
import { Toggle } from './Toggle';

interface PreferenceToggleProps {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: PreferenceToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-900">{label}</p>
        {description && <p className="text-sm text-stone-500">{description}</p>}
      </div>
      <Toggle label={label} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
