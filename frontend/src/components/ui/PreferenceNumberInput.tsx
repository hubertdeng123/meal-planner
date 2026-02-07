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
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="number"
        placeholder={placeholder}
        min={min}
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        className="input w-full"
      />
      {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
    </div>
  );
}
