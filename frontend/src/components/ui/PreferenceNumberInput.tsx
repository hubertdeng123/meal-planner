interface PreferenceNumberInputProps {
  label: string;
  placeholder?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  helperText?: string;
}

export default function PreferenceNumberInput({
  label,
  placeholder,
  value,
  onChange,
  min = 0,
  helperText,
}: PreferenceNumberInputProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1C1917] mb-2">{label}</label>
      <input
        type="number"
        placeholder={placeholder}
        min={min}
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        className="input w-full tabular-nums"
      />
      {helperText && <p className="text-xs text-[#78716C] mt-1.5">{helperText}</p>}
    </div>
  );
}
