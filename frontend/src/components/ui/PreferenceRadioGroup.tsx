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
    3: 'grid-cols-1 sm:grid-cols-3',
  };

  if (showDescriptions) {
    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold text-[#1C1917] mb-3">{label}</label>
        )}
        <div className={`grid ${gridCols[columns]} gap-3`}>
          {options.map(option => {
            const isSelected = value === option.value;
            return (
              <label
                key={option.value}
                className={`flex items-start gap-3 cursor-pointer p-3.5 border rounded-2xl transition-all duration-150 ${
                  isSelected
                    ? 'border-[#C84B31]/45 bg-[#F9F1EA] shadow-xs'
                    : 'border-[#E7E0D6] bg-white hover:border-[#D6CEC2] hover:bg-[#FAF7F2]'
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => onChange(option.value)}
                  className="mt-0.5 h-4 w-4 border-[#D6CEC2] text-[#C84B31] focus:ring-[#C84B31]/30"
                />
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-[#1C1917]">{option.label}</span>
                  {option.description && (
                    <p className="mt-0.5 text-xs text-[#57534E] leading-relaxed">
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-[#1C1917] mb-3">{label}</label>}
      <div className={`grid ${gridCols[columns]} gap-2.5`}>
        {options.map(option => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'border-[#C84B31]/45 bg-[#F9F1EA] text-[#1C1917] shadow-xs'
                  : 'border-[#E7E0D6] bg-white text-[#57534E] hover:border-[#D6CEC2] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 border-[#D6CEC2] text-[#C84B31] focus:ring-[#C84B31]/30"
              />
              <span className="text-sm font-medium capitalize">{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
