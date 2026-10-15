import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../../types';
import { ModalShell } from '../ui/ModalShell';
import { RecipeCover } from '../ui/RecipeCover';
import { SearchInput } from '../ui/SearchInput';
import { CheckCircleSolidIcon, ClockIcon, SparklesIcon, TrashIcon } from '../ui/AppIcons';
import { formatMinutes, isQuick, totalMinutes } from '../../utils/recipe';

interface RecipePickerProps {
  title: string;
  recipes: Recipe[];
  currentRecipeId?: number | null;
  onSelect: (recipe: Recipe) => void;
  onClear?: () => void;
  onClose: () => void;
}

function matches(recipe: Recipe, query: string): boolean {
  const haystack = [recipe.name, recipe.cuisine ?? '', ...recipe.tags].join(' ').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(term => haystack.includes(term));
}

export function RecipePicker({
  title,
  recipes,
  currentRecipeId,
  onSelect,
  onClear,
  onClose,
}: RecipePickerProps) {
  const [query, setQuery] = useState('');
  const [quickOnly, setQuickOnly] = useState(false);

  const results = useMemo(() => {
    const sorted = [...recipes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return sorted.filter(recipe => matches(recipe, query) && (!quickOnly || isQuick(recipe)));
  }, [recipes, query, quickOnly]);

  return (
    <ModalShell
      title={title}
      description={
        currentRecipeId ? 'Swap this meal or clear the slot.' : 'Pick a recipe for this slot.'
      }
      onClose={onClose}
      size="md"
      bodyClassName="pb-5"
    >
      <div className="sticky top-0 z-10 -mx-6 bg-white px-6 pb-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search recipes" />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            aria-pressed={quickOnly}
            onClick={() => setQuickOnly(value => !value)}
            className={`chip ${quickOnly ? 'chip-active' : ''}`}
          >
            <ClockIcon className="h-3.5 w-3.5" />
            Under 30 min
          </button>
          {currentRecipeId && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="chip ml-auto text-red-600 hover:border-red-200 hover:bg-red-50"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Clear slot
            </button>
          )}
        </div>
      </div>

      {results.length > 0 ? (
        <ul className="-mx-2 space-y-0.5" aria-label="Recipes">
          {results.map(recipe => {
            const selected = recipe.id === currentRecipeId;
            const minutes = totalMinutes(recipe);
            return (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => onSelect(recipe)}
                  aria-current={selected ? 'true' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft ${
                    selected ? 'bg-primary-soft' : 'hover:bg-stone-50'
                  }`}
                >
                  <RecipeCover
                    name={recipe.name}
                    imageUrl={recipe.image_url}
                    size="sm"
                    className="h-11 w-11 flex-shrink-0 rounded-lg"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {recipe.name}
                    </span>
                    <span className="block truncate text-xs text-stone-500">
                      {[minutes > 0 && formatMinutes(minutes), recipe.cuisine, recipe.tags[0]]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {selected && (
                    <CheckCircleSolidIcon className="h-5 w-5 flex-shrink-0 text-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-stone-800">
            {recipes.length === 0 ? 'No saved recipes yet' : 'No recipes match'}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {recipes.length === 0
              ? 'Make one and it will be ready to plan.'
              : 'Try another word, or make something new.'}
          </p>
          <Link to="/generate" className="btn-secondary btn-sm mt-4">
            <SparklesIcon className="h-4 w-4" />
            Make a recipe
          </Link>
        </div>
      )}
    </ModalShell>
  );
}
