import type { NutritionFacts } from '../../types';
import { FireStatsIcon } from '../ui/AppIcons';
import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface NutritionCardProps {
  nutrition?: NutritionFacts | null;
  loading?: boolean;
}

export function NutritionCard({ nutrition, loading = true }: NutritionCardProps) {
  const showSkeletons = loading && !nutrition;

  const items = nutrition
    ? [
        nutrition.calories !== undefined && {
          label: 'Calories',
          value: `${nutrition.calories}`,
          tone: 'warm' as const,
        },
        nutrition.protein_g !== undefined && {
          label: 'Protein',
          value: `${nutrition.protein_g}g`,
          tone: 'sage' as const,
        },
        nutrition.carbs_g !== undefined && {
          label: 'Carbs',
          value: `${nutrition.carbs_g}g`,
          tone: 'default' as const,
        },
        nutrition.fat_g !== undefined && {
          label: 'Fat',
          value: `${nutrition.fat_g}g`,
          tone: 'default' as const,
        },
        nutrition.fiber_g !== undefined && {
          label: 'Fiber',
          value: `${nutrition.fiber_g}g`,
          tone: 'sage' as const,
        },
        nutrition.sugar_g !== undefined && {
          label: 'Sugar',
          value: `${nutrition.sugar_g}g`,
          tone: 'default' as const,
        },
        nutrition.sodium_mg !== undefined && {
          label: 'Sodium',
          value: `${nutrition.sodium_mg}mg`,
          tone: 'default' as const,
        },
      ].filter(
        (item): item is { label: string; value: string; tone: 'warm' | 'sage' | 'default' } =>
          Boolean(item)
      )
    : [];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="icon-container-premium icon-container-sm icon-container-orange">
            <FireStatsIcon className="h-4 w-4 text-[#C84B31]" />
          </div>
          <div>
            <h3 className="section-title">Nutrition snapshot</h3>
            <p className="text-xs font-medium text-[#78716C]">Estimated per serving</p>
          </div>
        </div>
      </div>

      {showSkeletons ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] p-3 space-y-2"
            >
              <SkeletonShimmer width="w-16" height="h-3.5" />
              <SkeletonShimmer width="w-14" height="h-5" />
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((item, idx) => (
            <div
              key={item.label}
              className={`rounded-2xl border px-3.5 py-3 animate-scale-in ${
                item.tone === 'warm'
                  ? 'border-[#C84B31]/25 bg-[#F9F1EA] text-[#9A3412]'
                  : item.tone === 'sage'
                    ? 'border-[#3F624D]/25 bg-[#ECF5F0] text-[#2F6F4E]'
                    : 'border-[#E7E0D6] bg-[#FAF7F2] text-[#1C1917]'
              }`}
              style={{ animationDelay: `${idx * 45}ms` }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716C]">
                {item.label}
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums">{item.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#78716C]">No nutrition estimate available.</p>
      )}
    </div>
  );
}
