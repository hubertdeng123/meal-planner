import { useEffect, useMemo, useState } from 'react';
import type { MealPlanList, Recipe } from '../../types';
import mealPlanService from '../../services/mealPlan.service';
import recipeService from '../../services/recipe.service';
import { formatRange, todayIso } from '../../utils/date';
import { CheckIcon } from '../ui/AppIcons';
import { ModalShell } from '../ui/ModalShell';
import { SearchInput } from '../ui/SearchInput';
import { SegmentedControl } from '../ui/SegmentedControl';

type Source = 'plan' | 'recipes' | 'empty';

export type NewListRequest =
  | { source: 'plan'; planId: number }
  | { source: 'recipes'; recipeIds: number[] }
  | { source: 'empty' };

interface NewListDialogProps {
  creating: boolean;
  onCreate: (request: NewListRequest) => void;
  onClose: () => void;
}

export function NewListDialog({ creating, onCreate, onClose }: NewListDialogProps) {
  const [source, setSource] = useState<Source>('plan');
  const [plans, setPlans] = useState<MealPlanList[] | null>(null);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      mealPlanService.getMealPlansPaginated({
        page: 1,
        pageSize: 10,
        sort: 'start_date',
        order: 'desc',
      }),
      recipeService.getRecipes(0, 200),
    ])
      .then(([planPage, recipeList]) => {
        if (cancelled) return;
        const today = todayIso();
        const withMeals = planPage.items.filter(plan => plan.item_count > 0);
        setPlans(withMeals);
        setRecipes(recipeList);
        const current =
          withMeals.find(plan => plan.start_date <= today && today <= plan.end_date) ??
          withMeals[0];
        setPlanId(current?.id ?? null);
        if (withMeals.length === 0) setSource(recipeList.length ? 'recipes' : 'empty');
      })
      .catch(error => {
        console.error('Failed to load list sources:', error);
        if (!cancelled) {
          setLoadError(true);
          setSource('empty');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (recipes ?? []).filter(recipe => !needle || recipe.name.toLowerCase().includes(needle));
  }, [recipes, query]);

  const loading = plans === null && !loadError;
  const canCreate =
    !creating &&
    (source === 'empty' ||
      (source === 'plan' && planId !== null) ||
      (source === 'recipes' && selected.length > 0));

  const submit = () => {
    if (!canCreate) return;
    if (source === 'plan' && planId !== null) onCreate({ source: 'plan', planId });
    else if (source === 'recipes') onCreate({ source: 'recipes', recipeIds: selected });
    else onCreate({ source: 'empty' });
  };

  const toggleRecipe = (recipeId: number) =>
    setSelected(current =>
      current.includes(recipeId) ? current.filter(id => id !== recipeId) : [...current, recipeId]
    );

  return (
    <ModalShell
      title="New grocery list"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={!canCreate} onClick={submit}>
            {creating
              ? 'Building…'
              : source === 'recipes' && selected.length
                ? `Build from ${selected.length} recipe${selected.length === 1 ? '' : 's'}`
                : source === 'empty'
                  ? 'Start empty list'
                  : 'Build list'}
          </button>
        </>
      }
    >
      <SegmentedControl
        label="Build from"
        stretch
        value={source}
        onChange={setSource}
        options={[
          { value: 'plan', label: 'Meal plan' },
          { value: 'recipes', label: 'Recipes' },
          { value: 'empty', label: 'Empty' },
        ]}
      />

      <div className="mt-4 min-h-[12rem]">
        {loadError && source !== 'empty' && (
          <p className="text-sm text-red-600" role="alert">
            Couldn't load your plans and recipes. You can still start an empty list.
          </p>
        )}
        {loading && source !== 'empty' && (
          <div className="space-y-2" role="status" aria-label="Loading">
            {[0, 1, 2].map(row => (
              <div key={row} className="skeleton h-12 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!loading &&
          source === 'plan' &&
          plans &&
          (plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">
              No meal plans with meals yet. Plan a week first, or pick recipes.
            </p>
          ) : (
            <div role="radiogroup" aria-label="Meal plan" className="space-y-1.5">
              {plans.map(plan => {
                const active = plan.id === planId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPlanId(plan.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft ${
                      active
                        ? 'border-primary bg-primary-soft/50'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-stone-900">
                        {plan.name || 'Week plan'}
                      </span>
                      <span className="block text-xs text-stone-500">
                        {formatRange(plan.start_date, plan.end_date)} · {plan.item_count} meals
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`h-4 w-4 rounded-full border-2 ${
                        active
                          ? 'border-primary bg-primary shadow-[inset_0_0_0_2px_white]'
                          : 'border-stone-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          ))}

        {!loading && source === 'recipes' && recipes && (
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Search recipes" />
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-500">
                {recipes.length === 0 ? 'No saved recipes yet.' : 'No recipes match.'}
              </p>
            ) : (
              <ul className="-mx-2 mt-2 max-h-72 overflow-y-auto">
                {filtered.map(recipe => {
                  const checked = selected.includes(recipe.id);
                  return (
                    <li key={recipe.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggleRecipe(recipe.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] ${
                            checked ? 'border-primary bg-primary text-white' : 'border-stone-300'
                          }`}
                        >
                          {checked && <CheckIcon className="h-3.5 w-3.5" />}
                        </span>
                        <span className="truncate text-sm font-medium text-stone-800">
                          {recipe.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {source === 'empty' && (
          <p className="py-6 text-center text-sm text-stone-500">
            Start with a blank list and add items as you think of them.
          </p>
        )}
      </div>
    </ModalShell>
  );
}
