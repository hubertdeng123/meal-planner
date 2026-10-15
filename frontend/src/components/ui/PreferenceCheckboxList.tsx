interface PreferenceCheckboxListProps {
  label: string;
  items: string[];
  selectedItems: string[];
  onChange: (items: string[]) => void;
  columns?: 2 | 3 | 4;
}

export default function PreferenceCheckboxList({
  label,
  items,
  selectedItems,
  onChange,
  columns = 3,
}: PreferenceCheckboxListProps) {
  const toggleItem = (item: string) => {
    if (selectedItems.includes(item)) {
      onChange(selectedItems.filter(i => i !== item));
    } else {
      onChange([...selectedItems, item]);
    }
  };

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-[#1C1917] mb-3">{label}</label>}
      <div className={`grid ${gridCols[columns]} gap-2.5`}>
        {items.map(item => {
          const isSelected = selectedItems.includes(item);
          return (
            <label
              key={item}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'border-[#C84B31]/40 bg-[#F9F1EA] text-[#1C1917] shadow-xs'
                  : 'border-[#E7E0D6] bg-white text-[#57534E] hover:border-[#D6CEC2] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleItem(item)}
                className="h-4 w-4 rounded border-[#D6CEC2] text-[#C84B31] focus:ring-[#C84B31]/30"
              />
              <span className="text-sm font-medium leading-snug">{item}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
