interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface PreferenceRadioGroupProps {
  label: string;
  name: string;
  options: RadioOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  columns?: 2 | 3;
  showDescriptions?: boolean;
}

export default function PreferenceRadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  columns = 3,
  showDescriptions = false,
}: PreferenceRadioGroupProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-3',
  };

  if (showDescriptions) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>
        <div className={`grid ${gridCols[columns]} gap-3`}>
          {options.map(option => (
            <label
              key={option.value}
              className="flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition-colors"
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="mt-1 border-gray-300 text-primary focus:ring-primary-soft"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{option.label}</span>
                {option.description && (
                  <p className="text-xs text-gray-500">{option.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>
      <div className={`grid ${gridCols[columns]} gap-3`}>
        {options.map(option => (
          <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="border-gray-300 text-primary focus:ring-primary-soft"
            />
            <span className="text-sm text-gray-700 capitalize">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
