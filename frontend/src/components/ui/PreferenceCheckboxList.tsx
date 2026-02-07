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
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>
      <div className={`grid ${gridCols[columns]} gap-3`}>
        {items.map(item => (
          <label key={item} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedItems.includes(item)}
              onChange={() => toggleItem(item)}
              className="rounded border-gray-300 text-primary focus:ring-primary-soft"
            />
            <span className="text-sm text-gray-700">{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
