import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleSolidIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TrashIcon,
} from '../components/ui/AppIcons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { OverflowMenu } from '../components/ui/OverflowMenu';
import { RecipeCover } from '../components/ui/RecipeCover';
import { Spinner } from '../components/ui/PageLoader';
import { Stepper } from '../components/ui/Stepper';
import { RecipePicker } from '../components/mealplan/RecipePicker';
import { useToast } from '../contexts/ToastContext';
import mealPlanService from '../services/mealPlan.service';
import notificationService from '../services/notification.service';
import recipeService from '../services/recipe.service';
import type { MealPlan, MealPlanItem, MealType, Recipe } from '../types';
import {
  formatLocalDate,
  formatRange,
  getDateRange,
  parseLocalIsoDate,
  todayIso,
} from '../utils/date';
import {
  MEAL_LABELS,
  PLAN_MEAL_TYPES,
  computePlanHealth,
  indexItems,
  itemRecipeName,
  slotKey,
} from '../utils/mealPlan';
import { formatMinutes, totalMinutes } from '../utils/recipe';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ActiveSlot {
  date: string;
  meal: MealType;
}

const SERVINGS_DEBOUNCE_MS = 500;

function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}

export default function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const planId = Number(id);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [inFlight, setInFlight] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'autofill' | 'grocery' | 'copy' | 'email' | null>(
    null
  );
  const [confirmClearWeek, setConfirmClearWeek] = useState(false);

  const servingsTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingServings = useRef(new Map<number, number>());

  const load = useCallback(
    async (quiet = false) => {
      if (!Number.isFinite(planId)) {
        setLoadState('not-found');
        return;
      }
      if (!quiet) setLoadState('loading');
      try {
        const [planData, recipeList] = await Promise.all([
          mealPlanService.getMealPlan(planId),
          recipeService.getRecipes(0, 200),
        ]);
        setPlan(planData);
        setItems(planData.items);
        setRecipes(recipeList);
        setLoadState('ready');
      } catch (error) {
        console.error('Failed to load meal plan:', error);
        if (!quiet) setLoadState(isNotFound(error) ? 'not-found' : 'error');
        else addToast('Could not refresh the plan.', 'error');
      }
    },
    [planId, addToast]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timers = servingsTimers.current;
    const pending = pendingServings.current;
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      pending.forEach((servings, itemId) => {
        void mealPlanService.updateMealPlanItem(planId, itemId, { servings });
      });
    };
  }, [planId]);

  const track = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setInFlight(count => count + 1);
    setSaveState('saving');
    try {
      const result = await operation();
      setSaveState(current => (current === 'error' ? current : 'saved'));
      return result;
    } catch (error) {
      setSaveState('error');
      throw error;
    } finally {
      setInFlight(count => count - 1);
    }
  }, []);

  const days = useMemo(() => (plan ? getDateRange(plan.start_date, plan.end_date) : []), [plan]);
  const slots = useMemo(() => indexItems(items), [items]);
  const recipeById = useMemo(() => new Map(recipes.map(recipe => [recipe.id, recipe])), [recipes]);
  const usage = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of items) {
      if (item.recipe_id) counts.set(item.recipe_id, (counts.get(item.recipe_id) ?? 0) + 1);
    }
    return counts;
  }, [items]);
  const health = useMemo(
    () =>
      computePlanHealth(days, slots, recipeId => {
        const recipe = recipeById.get(recipeId);
        return recipe ? (recipe.total_minutes ?? totalMinutes(recipe)) : null;
      }),
    [days, slots, recipeById]
  );

  if (loadState === 'loading') return <PlannerSkeleton />;
  if (loadState === 'not-found') {
    return (
      <EmptyState
        title="We couldn't find that plan"
        description="It may have been deleted."
        action={
          <Link to="/meal-plans" className="btn-primary">
            Back to meal plans
          </Link>
        }
      />
    );
  }
  if (loadState === 'error' || !plan) {
    return (
      <ErrorState
        title="Couldn't load this plan"
        description="Check your connection and try again."
        onRetry={() => void load()}
      />
    );
  }

  const today = todayIso();
  const visibleDay =
    selectedDay && days.includes(selectedDay)
      ? selectedDay
      : days.includes(today)
        ? today
        : days[0];
  const saving = inFlight > 0 || saveState === 'saving';

  const recipeName = (item: MealPlanItem) =>
    (item.recipe_id && recipeById.get(item.recipe_id)?.name) ||
    itemRecipeName(item) ||
    (item.recipe_id ? `Recipe #${item.recipe_id}` : 'Untitled meal');

  const assignRecipe = async ({ date, meal }: ActiveSlot, recipe: Recipe) => {
    setActiveSlot(null);
    const existing = slots.get(slotKey(date, meal));
    if (existing?.recipe_id === recipe.id) return;

    if (existing) {
      setItems(current =>
        current.map(item => (item.id === existing.id ? { ...item, recipe_id: recipe.id } : item))
      );
      try {
        await track(() =>
          mealPlanService.updateMealPlanItem(plan.id, existing.id, {
            recipe_id: recipe.id,
            servings: existing.servings,
          })
        );
      } catch (error) {
        console.error('Failed to update slot:', error);
        setItems(current => current.map(item => (item.id === existing.id ? existing : item)));
        addToast(`Couldn't save ${MEAL_LABELS[meal].toLowerCase()}. Try again?`, 'error');
      }
      return;
    }

    const tempId = -Date.now();
    const servings = Math.max(1, recipe.servings || 2);
    setItems(current => [
      ...current,
      { id: tempId, meal_plan_id: plan.id, date, meal_type: meal, servings, recipe_id: recipe.id },
    ]);
    try {
      const created = await track(() =>
        mealPlanService.addMealPlanItem(plan.id, {
          date,
          meal_type: meal,
          servings,
          recipe_id: recipe.id,
        })
      );
      setItems(current => current.map(item => (item.id === tempId ? created : item)));
    } catch (error) {
      console.error('Failed to add slot:', error);
      setItems(current => current.filter(item => item.id !== tempId));
      addToast(`Couldn't save ${MEAL_LABELS[meal].toLowerCase()}. Try again?`, 'error');
    }
  };

  const removeItems = async (targets: MealPlanItem[]) => {
    const persisted = targets.filter(item => item.id > 0);
    const ids = new Set(persisted.map(item => item.id));
    if (ids.size === 0) return;
    setItems(current => current.filter(item => !ids.has(item.id)));
    const results = await Promise.allSettled(
      persisted.map(item => track(() => mealPlanService.deleteMealPlanItem(plan.id, item.id)))
    );
    const failed = persisted.filter((_, index) => results[index].status === 'rejected');
    if (failed.length > 0) {
      setItems(current => [...current, ...failed]);
      addToast(`Couldn't clear ${failed.length} meal${failed.length === 1 ? '' : 's'}.`, 'error');
    }
  };

  const clearSlot = (slot: ActiveSlot) => {
    setActiveSlot(null);
    const existing = slots.get(slotKey(slot.date, slot.meal));
    if (existing) void removeItems([existing]);
  };

  const clearDay = (date: string) => {
    void removeItems(items.filter(item => item.date.slice(0, 10) === date));
  };

  const changeServings = (item: MealPlanItem, servings: number) => {
    setItems(current =>
      current.map(entry => (entry.id === item.id ? { ...entry, servings } : entry))
    );
    pendingServings.current.set(item.id, servings);
    const timers = servingsTimers.current;
    clearTimeout(timers.get(item.id));
    setSaveState('saving');
    timers.set(
      item.id,
      setTimeout(() => {
        timers.delete(item.id);
        pendingServings.current.delete(item.id);
        track(() => mealPlanService.updateMealPlanItem(plan.id, item.id, { servings })).catch(
          error => {
            console.error('Failed to update servings:', error);
            addToast("Couldn't save servings. Try again?", 'error');
          }
        );
      }, SERVINGS_DEBOUNCE_MS)
    );
  };

  const handleAutofill = async () => {
    setBusyAction('autofill');
    try {
      const result = await track(() => mealPlanService.autofill(plan.id));
      addToast(result.message || 'Filled the open slots.', 'success');
      await load(true);
    } catch (error) {
      console.error('Failed to autofill:', error);
      addToast('Could not autofill this week.', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleGroceryList = async () => {
    setBusyAction('grocery');
    try {
      const list = await mealPlanService.createGroceryList(plan.id);
      addToast('Grocery list ready.', 'success');
      navigate(`/grocery/${list.id}`);
    } catch (error) {
      console.error('Failed to create grocery list:', error);
      addToast('Could not build the grocery list.', 'error');
      setBusyAction(null);
    }
  };

  const handleEmail = async () => {
    setBusyAction('email');
    try {
      await notificationService.sendWeeklyMealPlanNotification(plan.id);
      addToast('Plan sent to your inbox.', 'success');
    } catch (error) {
      console.error('Failed to email plan:', error);
      addToast('Could not send the plan email.', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyPrevious = async () => {
    setBusyAction('copy');
    try {
      const list = await mealPlanService.getMealPlansPaginated({
        page: 1,
        pageSize: 25,
        sort: 'start_date',
        order: 'desc',
      });
      const previous = list.items
        .filter(entry => entry.id !== plan.id && entry.end_date < plan.start_date)
        .sort((a, b) => (a.end_date < b.end_date ? 1 : -1))[0];
      if (!previous) {
        addToast('No earlier plan to copy from.', 'info');
        return;
      }

      const source = await mealPlanService.getMealPlan(previous.id);
      const byWeekday = new Map<string, MealPlanItem>();
      for (const item of source.items) {
        if (!item.recipe_id) continue;
        byWeekday.set(`${parseLocalIsoDate(item.date).getDay()}|${item.meal_type}`, item);
      }

      const additions = days.flatMap(date =>
        PLAN_MEAL_TYPES.flatMap(meal => {
          const match = byWeekday.get(`${parseLocalIsoDate(date).getDay()}|${meal}`);
          if (!match || slots.has(slotKey(date, meal))) return [];
          return [
            {
              date,
              meal_type: meal,
              servings: match.servings || 1,
              recipe_id: match.recipe_id ?? undefined,
            },
          ];
        })
      );
      if (additions.length === 0) {
        addToast('Nothing to copy into the open slots.', 'info');
        return;
      }

      const created = await track(() =>
        Promise.all(additions.map(payload => mealPlanService.addMealPlanItem(plan.id, payload)))
      );
      setItems(current => [...current, ...created]);
      addToast(
        `Copied ${created.length} meal${created.length === 1 ? '' : 's'} from ${previous.name || 'last week'}.`,
        'success'
      );
    } catch (error) {
      console.error('Failed to copy previous week:', error);
      addToast('Could not copy last week.', 'error');
      await load(true);
    } finally {
      setBusyAction(null);
    }
  };

  const handleClearWeek = async () => {
    setConfirmClearWeek(false);
    await removeItems(items);
  };

  const activeItem = activeSlot ? slots.get(slotKey(activeSlot.date, activeSlot.meal)) : undefined;
  const gridStyle = { '--days': Math.min(days.length, 7) } as CSSProperties;

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <Link
        to="/meal-plans"
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-stone-500 transition hover:text-stone-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Meal plans
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{formatRange(plan.start_date, plan.end_date)}</p>
          <h1 className="page-title mt-1 truncate">{plan.name || 'This week'}</h1>
          <SaveIndicator state={saving ? 'saving' : saveState} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutofill}
            disabled={busyAction !== null || health.filled === health.total}
            className="btn-secondary flex-1 sm:flex-none"
          >
            {busyAction === 'autofill' ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <SparklesIcon className="h-4 w-4" />
            )}
            Autofill
          </button>
          <button
            type="button"
            onClick={handleGroceryList}
            disabled={busyAction !== null || saving || health.filled === 0}
            className="btn-primary flex-1 sm:flex-none"
          >
            {busyAction === 'grocery' ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <ShoppingBagIcon className="h-4 w-4" />
            )}
            Grocery list
          </button>
          <OverflowMenu
            label="More plan actions"
            items={[
              {
                label: busyAction === 'copy' ? 'Copying…' : 'Copy previous week',
                icon: DocumentDuplicateIcon,
                disabled: busyAction !== null,
                onSelect: () => void handleCopyPrevious(),
              },
              {
                label: busyAction === 'email' ? 'Sending…' : 'Email this plan',
                icon: EnvelopeIcon,
                disabled: busyAction !== null || health.filled === 0,
                onSelect: () => void handleEmail(),
              },
              {
                label: 'Clear week',
                icon: TrashIcon,
                tone: 'danger',
                disabled: items.length === 0,
                onSelect: () => setConfirmClearWeek(true),
              },
            ]}
          />
        </div>
      </header>

      <PlanHealthBar health={health} />

      <div className="mt-5 lg:hidden" role="group" aria-label="Choose a day">
        <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {days.map(date => {
            const selected = date === visibleDay;
            const count = PLAN_MEAL_TYPES.filter(meal => slots.has(slotKey(date, meal))).length;
            return (
              <button
                key={date}
                type="button"
                aria-pressed={selected}
                aria-label={`${formatLocalDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}, ${count} of 3 planned`}
                onClick={() => setSelectedDay(date)}
                className={`flex min-w-[3.25rem] flex-1 flex-col items-center rounded-xl border py-2 transition ${
                  selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-stone-200 bg-white text-stone-700'
                }`}
              >
                <span className="text-[11px] font-medium uppercase">
                  {date === today ? 'Today' : formatLocalDate(date, { weekday: 'short' })}
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {formatLocalDate(date, { day: 'numeric' })}
                </span>
                <span className="mt-1 flex gap-0.5" aria-hidden="true">
                  {PLAN_MEAL_TYPES.map(meal => (
                    <span
                      key={meal}
                      className={`h-1 w-1 rounded-full ${
                        slots.has(slotKey(date, meal))
                          ? selected
                            ? 'bg-white'
                            : 'bg-primary'
                          : selected
                            ? 'bg-white/35'
                            : 'bg-stone-200'
                      }`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={gridStyle}
        className="mt-4 grid gap-3 lg:mt-6 lg:grid-rows-[auto_repeat(3,auto)] lg:[grid-template-columns:repeat(var(--days),minmax(0,1fr))]"
      >
        {days.map(date => {
          const isToday = date === today;
          const isPast = date < today;
          const dayItems = PLAN_MEAL_TYPES.map(meal => slots.get(slotKey(date, meal)));
          const weekday = formatLocalDate(date, { weekday: 'long' });
          return (
            <section
              key={date}
              aria-label={formatLocalDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
              className={`${date === visibleDay ? 'flex' : 'hidden'} min-w-0 flex-col gap-2 lg:row-span-4 lg:grid lg:grid-rows-subgrid ${
                isPast ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <h2
                  className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-stone-800'}`}
                >
                  <span className="lg:hidden">{weekday}</span>
                  <span className="hidden lg:inline">
                    {formatLocalDate(date, { weekday: 'short' })}{' '}
                    <span
                      className={`inline-flex min-w-[1.5rem] justify-center rounded-full px-1 tabular-nums ${
                        isToday ? 'bg-primary text-white' : 'text-stone-400'
                      }`}
                    >
                      {formatLocalDate(date, { day: 'numeric' })}
                    </span>
                  </span>
                  {isToday && (
                    <span className="ml-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-ink lg:sr-only">
                      Today
                    </span>
                  )}
                </h2>
                {dayItems.some(Boolean) && (
                  <button
                    type="button"
                    onClick={() => clearDay(date)}
                    aria-label={`Clear ${weekday}`}
                    className="rounded-md px-1.5 py-0.5 text-xs font-medium text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {PLAN_MEAL_TYPES.map((meal, index) => {
                const item = dayItems[index];
                const slot = { date, meal };
                const label = `${MEAL_LABELS[meal]} on ${weekday}`;
                if (!item) {
                  return (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => setActiveSlot(slot)}
                      aria-label={`Add ${label.toLowerCase()}`}
                      className="group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/50 px-4 py-3 text-left transition hover:border-primary hover:bg-primary-soft/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft lg:min-h-[7.5rem] lg:flex-col lg:items-start lg:justify-between lg:px-3"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                        {MEAL_LABELS[meal]}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-stone-500 group-hover:text-primary lg:ml-0">
                        <PlusIcon className="h-4 w-4" />
                        Add
                      </span>
                    </button>
                  );
                }

                const recipe = item.recipe_id ? recipeById.get(item.recipe_id) : undefined;
                const name = recipeName(item);
                const minutes = recipe ? (recipe.total_minutes ?? totalMinutes(recipe)) : 0;
                const repeats = item.recipe_id ? (usage.get(item.recipe_id) ?? 0) : 0;
                return (
                  <article
                    key={meal}
                    className="flex min-h-[4.5rem] flex-col rounded-2xl border border-stone-200 bg-white shadow-xs lg:min-h-[7.5rem]"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSlot(slot)}
                      aria-label={`Change ${label.toLowerCase()}: ${name}`}
                      className="flex flex-1 items-start gap-3 rounded-t-2xl p-3 text-left transition hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
                    >
                      <RecipeCover
                        name={name}
                        imageUrl={recipe?.image_url}
                        size="sm"
                        className="h-12 w-12 flex-shrink-0 rounded-xl lg:hidden"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                          {MEAL_LABELS[meal]}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-stone-900">
                          {name}
                        </span>
                        {minutes > 0 && (
                          <span className="mt-0.5 block text-xs text-stone-500">
                            {formatMinutes(minutes)}
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-3 py-2">
                      <Stepper
                        label={`Servings for ${label.toLowerCase()}`}
                        value={item.servings}
                        onChange={value => changeServings(item, value)}
                        min={1}
                        max={20}
                        size="sm"
                        className={item.id < 0 ? 'pointer-events-none opacity-50' : ''}
                      />
                      {repeats >= 3 && (
                        <p className="flex items-center gap-1 text-xs font-medium text-amber-700">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Repeated {repeats} times this week.</span>
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>

      {activeSlot && (
        <RecipePicker
          title={`${formatLocalDate(activeSlot.date, { weekday: 'long' })} ${MEAL_LABELS[activeSlot.meal].toLowerCase()}`}
          recipes={recipes}
          currentRecipeId={activeItem?.recipe_id}
          onSelect={recipe => void assignRecipe(activeSlot, recipe)}
          onClear={() => clearSlot(activeSlot)}
          onClose={() => setActiveSlot(null)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmClearWeek}
        title="Clear the whole week?"
        description={`This removes all ${items.length} planned meals. Your recipes stay saved.`}
        confirmLabel="Clear week"
        tone="danger"
        onCancel={() => setConfirmClearWeek(false)}
        onConfirm={() => void handleClearWeek()}
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') {
    return <p className="mt-1 text-sm text-stone-500">Changes save automatically.</p>;
  }
  return (
    <p className="mt-1 flex items-center gap-1.5 text-sm" role="status" aria-live="polite">
      {state === 'saving' && (
        <>
          <Spinner className="h-4 w-4" />
          <span className="text-stone-500">Saving…</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <CheckCircleSolidIcon className="h-4 w-4 text-primary" />
          <span className="text-stone-500">All changes saved</span>
        </>
      )}
      {state === 'error' && (
        <>
          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
          <span className="text-red-700">Some changes didn't save</span>
        </>
      )}
    </p>
  );
}

function PlanHealthBar({ health }: { health: ReturnType<typeof computePlanHealth> }) {
  const meters = [
    { label: 'Filled', value: health.coverage, display: `${health.filled}/${health.total}` },
    { label: 'Variety', value: health.variety, display: `${Math.round(health.variety * 100)}%` },
    { label: 'Quick', value: health.quick, display: `${Math.round(health.quick * 100)}%` },
  ];
  return (
    <section
      aria-labelledby="plan-health-heading"
      className="mt-5 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="flex items-baseline gap-2">
        <h2 id="plan-health-heading" className="text-sm font-semibold text-stone-800">
          Plan health
        </h2>
        <span className="text-lg font-semibold tabular-nums text-stone-900">{health.score}</span>
        <span className="text-xs text-stone-400">/100</span>
      </div>
      <dl className="grid flex-1 grid-cols-3 gap-4">
        {meters.map(meter => (
          <div key={meter.label}>
            <div className="flex items-baseline justify-between text-xs">
              <dt className="text-stone-500">{meter.label}</dt>
              <dd className="font-semibold tabular-nums text-stone-800">{meter.display}</dd>
            </div>
            <div className="progress-track mt-1 h-1.5" aria-hidden="true">
              <div
                className="progress-bar"
                style={{ width: `${Math.round(meter.value * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
      <p className="text-sm text-stone-600 sm:max-w-[16rem]">{health.tip}</p>
    </section>
  );
}

function PlannerSkeleton() {
  return (
    <div className="mx-auto max-w-7xl" role="status" aria-label="Loading plan">
      <div className="skeleton mb-4 h-4 w-24" />
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-2 h-8 w-64" />
      <div className="skeleton mt-5 h-16 w-full rounded-2xl" />
      <div className="mt-6 grid gap-3 lg:grid-cols-7">
        {Array.from({ length: 7 }, (_, day) => (
          <div key={day} className={`space-y-2 ${day > 0 ? 'hidden lg:block' : ''}`}>
            <div className="skeleton h-4 w-16" />
            {PLAN_MEAL_TYPES.map(meal => (
              <div key={meal} className="skeleton h-[7.5rem] rounded-2xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
