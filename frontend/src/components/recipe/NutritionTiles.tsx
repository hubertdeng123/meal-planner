import type { NutritionFacts } from '../../types';

const FIELDS: Array<{ key: keyof NutritionFacts; label: string; unit: string }> = [
  { key: 'calories', label: 'Calories', unit: '' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
  { key: 'sugar_g', label: 'Sugar', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
];

export function NutritionTiles({ nutrition }: { nutrition?: NutritionFacts | null }) {
  if (!nutrition) return null;
  const present = FIELDS.filter(field => typeof nutrition[field.key] === 'number');
  if (present.length === 0) return null;

  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {present.map((field, index) => (
        <div
          key={field.key}
          className={`rounded-xl px-3 py-2.5 animate-scale-in ${
            index === 0 ? 'bg-accent-soft text-accent-ink' : 'bg-stone-50 text-stone-900'
          }`}
        >
          <dt className="text-[11px] font-medium uppercase tracking-wide opacity-70">
            {field.label}
          </dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums">
            {Math.round(nutrition[field.key] as number)}
            <span className="ml-0.5 text-xs font-medium opacity-60">{field.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
