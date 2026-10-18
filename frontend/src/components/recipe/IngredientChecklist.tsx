import type { Ingredient } from '../../types';
import { CheckIcon } from '../ui/AppIcons';
import { formatAmount } from '../../utils/recipe';

interface IngredientChecklistProps {
  ingredients: Ingredient[];
  checked: Set<number>;
  onToggle: (index: number) => void;
  scale?: number;
  tone?: 'light' | 'dark';
}

export function IngredientChecklist({
  ingredients,
  checked,
  onToggle,
  scale = 1,
  tone = 'light',
}: IngredientChecklistProps) {
  const dark = tone === 'dark';

  return (
    <ul className={dark ? 'divide-y divide-white/10' : 'divide-y divide-stone-100'}>
      {ingredients.map((ingredient, index) => {
        const isChecked = checked.has(index);
        const amount = formatAmount(ingredient, scale);
        return (
          <li key={`${ingredient.name}-${index}`}>
            <label
              className={`flex min-h-[3rem] cursor-pointer items-center gap-3 rounded-lg px-1 py-2 transition-colors ${
                dark ? 'hover:bg-white/5' : 'hover:bg-stone-50'
              }`}
            >
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isChecked}
                onChange={() => onToggle(index)}
              />
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors peer-focus-visible:ring-4 ${
                  isChecked
                    ? 'border-primary bg-primary text-white'
                    : dark
                      ? 'border-white/40'
                      : 'border-stone-300 bg-white'
                } ${dark ? 'peer-focus-visible:ring-white/20' : 'peer-focus-visible:ring-primary-soft'}`}
              >
                {isChecked && <CheckIcon className="h-3.5 w-3.5 animate-check-in" />}
              </span>
              <span
                className={`min-w-0 flex-1 text-[15px] transition-colors ${
                  isChecked
                    ? dark
                      ? 'text-white/40 line-through'
                      : 'text-stone-400 line-through'
                    : dark
                      ? 'text-white'
                      : 'text-stone-800'
                }`}
              >
                {ingredient.name}
                {ingredient.notes && (
                  <span className={dark ? 'text-white/50' : 'text-stone-500'}>
                    , {ingredient.notes}
                  </span>
                )}
              </span>
              {amount && (
                <span
                  className={`flex-shrink-0 text-sm font-semibold tabular-nums ${
                    isChecked ? 'opacity-40' : ''
                  } ${dark ? 'text-[#f0c7b0]' : 'text-stone-600'}`}
                >
                  {amount}
                </span>
              )}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
