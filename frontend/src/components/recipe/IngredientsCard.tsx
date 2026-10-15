import { useState } from 'react';
import { CheckIcon, ScaleIcon } from '../ui/AppIcons';
import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface IngredientsCardProps {
  ingredients: Ingredient[];
  loading?: boolean;
  predictedCount?: number;
  baseServings?: number;
  interactive?: boolean;
}

function formatScaledQuantity(quantity: number, multiplier: number): string {
  const scaled = quantity * multiplier;
  if (!Number.isFinite(scaled) || scaled <= 0) {
    return String(quantity);
  }
  const rounded = Math.round(scaled * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(parseFloat(rounded.toFixed(2)));
}

export function IngredientsCard({
  ingredients,
  loading = true,
  predictedCount = 10,
  baseServings = 4,
  interactive = false,
}: IngredientsCardProps) {
  const showSkeletons = loading && ingredients.length === 0;
  const skeletonCount = predictedCount;
  const [scaledServings, setScaledServings] = useState<number>(baseServings || 4);
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());

  const effectiveBaseServings = baseServings > 0 ? baseServings : 4;
  const multiplier = interactive ? scaledServings / effectiveBaseServings : 1;
  const isScaled = interactive && scaledServings !== effectiveBaseServings;

  const toggleIngredient = (idx: number) => {
    if (!interactive) return;
    setCheckedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="icon-container-premium icon-container-sm icon-container-emerald">
            <ScaleIcon className="h-4 w-4 text-[#2F6F4E]" />
          </div>
          <div>
            <h3 className="section-title">Ingredients</h3>
            {interactive && ingredients.length > 0 && (
              <p className="text-xs font-medium text-[#78716C] tabular-nums">
                {checkedIndices.size} of {ingredients.length} prepped
              </p>
            )}
          </div>
        </div>
        {ingredients.length > 0 && !interactive && (
          <span className="text-xs font-medium text-[#78716C] tabular-nums">
            {ingredients.length} items
          </span>
        )}
      </div>

      {interactive && ingredients.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#57534E]">
            Scale Servings
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScaledServings(prev => Math.max(1, prev - 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D6CEC2] bg-white text-sm font-semibold text-[#1C1917] hover:bg-[#F3EFE6] transition-colors"
              aria-label="Decrease servings"
            >
              -
            </button>
            <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-[#1C1917]">
              {scaledServings} {scaledServings === 1 ? 'serving' : 'servings'}
            </span>
            <button
              type="button"
              onClick={() => setScaledServings(prev => prev + 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D6CEC2] bg-white text-sm font-semibold text-[#1C1917] hover:bg-[#F3EFE6] transition-colors"
              aria-label="Increase servings"
            >
              +
            </button>
            {isScaled && (
              <button
                type="button"
                onClick={() => setScaledServings(effectiveBaseServings)}
                className="ml-1 text-xs font-semibold text-[#C84B31] hover:text-[#B83B22] transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {showSkeletons
          ? Array.from({ length: skeletonCount }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <SkeletonShimmer width="w-5" height="h-5" rounded="full" />
                <SkeletonShimmer width="w-full" height="h-5" />
              </div>
            ))
          : ingredients.map((ing, idx) => {
              const isChecked = checkedIndices.has(idx);
              const displayedQty = formatScaledQuantity(ing.quantity, multiplier);

              return (
                <div
                  key={idx}
                  onClick={() => toggleIngredient(idx)}
                  role={interactive ? 'checkbox' : undefined}
                  aria-checked={interactive ? isChecked : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onKeyDown={
                    interactive
                      ? e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleIngredient(idx);
                          }
                        }
                      : undefined
                  }
                  className={`flex items-start gap-3 rounded-2xl border px-3.5 py-2.5 transition-all duration-150 animate-slide-in-left ${
                    interactive ? 'cursor-pointer select-none' : ''
                  } ${
                    isChecked
                      ? 'border-[#3F624D]/25 bg-[#ECF5F0]/60 text-[#78716C]'
                      : 'border-transparent bg-[#FAF7F2]/70 hover:border-[#E7E0D6] hover:bg-[#FAF7F2]'
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {interactive ? (
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isChecked
                          ? 'border-[#2F6F4E] bg-[#2F6F4E] text-white'
                          : 'border-[#D6CEC2] bg-white'
                      }`}
                    >
                      {isChecked && <CheckIcon className="h-3 w-3 text-white" />}
                    </span>
                  ) : (
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C84B31]" />
                  )}
                  <div className={`flex-1 text-sm ${isChecked ? 'line-through opacity-75' : ''}`}>
                    <span className="font-semibold tabular-nums text-[#1C1917]">
                      {displayedQty} {ing.unit}
                    </span>{' '}
                    <span className="text-[#1C1917]">{ing.name}</span>
                    {ing.notes && <span className="text-[#78716C]"> ({ing.notes})</span>}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
