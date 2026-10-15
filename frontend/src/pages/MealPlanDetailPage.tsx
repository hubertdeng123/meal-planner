import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  SparklesIcon,
} from '../components/ui/AppIcons';

import { InlineStatus } from '../components/ui/InlineStatus';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { StatPill } from '../components/ui/StatPill';
import { useToast } from '../contexts/ToastContext';
import mealPlanService from '../services/mealPlan.service';
import notificationService from '../services/notification.service';
import recipeService from '../services/recipe.service';
import type { MealPlan, MealPlanItem, MealType, Recipe } from '../types';
import { formatLocalDate, parseLocalIsoDate, toLocalIsoDate } from '../utils/date';

type SlotDraft = {
  itemId?: number;
  recipeId?: number;
  servings: number;
};

function serializeDrafts(drafts: Record<string, SlotDraft>): string {
  return JSON.stringify(
    Object.keys(drafts)
      .sort()
      .map(key => ({
        key,
        itemId: drafts[key]?.itemId ?? null,
        recipeId: drafts[key]?.recipeId ?? null,
        servings: drafts[key]?.servings ?? 1,
      }))
  );
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = parseLocalIsoDate(start);
  const endDate = parseLocalIsoDate(end);
  while (cursor <= endDate) {
    dates.push(toLocalIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function toKey(date: string, mealType: MealType) {
  return `${date}__${mealType}`;
}

export default function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [slotDrafts, setSlotDrafts] = useState<Record<string, SlotDraft>>({});
  const [baselineDrafts, setBaselineDrafts] = useState<Record<string, SlotDraft>>({});
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copyingPreviousWeek, setCopyingPreviousWeek] = useState(false);

  const days = useMemo(() => {
    if (!mealPlan) return [];
    return getDateRange(mealPlan.start_date, mealPlan.end_date);
  }, [mealPlan]);

  const visibleDays = useMemo(() => {
    if (selectedDay === 'all' || !days.includes(selectedDay)) {
      return days;
    }
    return [selectedDay];
  }, [days, selectedDay]);

  const hasUnsavedChanges = useMemo(
    () => serializeDrafts(slotDrafts) !== serializeDrafts(baselineDrafts),
    [slotDrafts, baselineDrafts]
  );

  const recipeUsageCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const draft of Object.values(slotDrafts)) {
      if (!draft.recipeId) continue;
      counts[draft.recipeId] = (counts[draft.recipeId] ?? 0) + 1;
    }
    return counts;
  }, [slotDrafts]);

  const recipeById = useMemo(() => {
    return new Map(recipes.map(recipe => [recipe.id, recipe]));
  }, [recipes]);

  const planHealth = useMemo(() => {
    const totalSlots = days.length * MEAL_TYPES.length;
    let filledSlots = 0;
    let quickMeals = 0;
    const assignedRecipeIds: number[] = [];

    for (const date of days) {
      for (const mealType of MEAL_TYPES) {
        const draft = slotDrafts[toKey(date, mealType)];
        if (!draft?.recipeId) continue;
        filledSlots += 1;
        assignedRecipeIds.push(draft.recipeId);
        const recipe = recipeById.get(draft.recipeId);
        if (recipe) {
          const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
          if (totalTime > 0 && totalTime <= 30) {
            quickMeals += 1;
          }
        }
      }
    }

    const uniqueRecipes = new Set(assignedRecipeIds).size;
    const coverageRatio = totalSlots > 0 ? filledSlots / totalSlots : 0;
    const varietyRatio = filledSlots > 0 ? uniqueRecipes / filledSlots : 0;
    const quickMealRatio = filledSlots > 0 ? quickMeals / filledSlots : 0;
    const score = Math.round(coverageRatio * 50 + varietyRatio * 30 + quickMealRatio * 20);

    const guidance: string[] = [];
    if (coverageRatio < 0.8) guidance.push('Fill more open slots for smoother daily execution.');
    if (varietyRatio < 0.55) guidance.push('Rotate in more unique recipes to avoid repetition.');
    if (quickMealRatio < 0.3) guidance.push('Add a few <=30 minute meals for busy days.');
    if (guidance.length === 0)
      guidance.push('Plan looks balanced. Save and build your grocery list.');

    return {
      score,
      filledSlots,
      totalSlots,
      coverageRatio,
      varietyRatio,
      quickMealRatio,
      guidance,
    };
  }, [days, recipeById, slotDrafts]);

  const mapPlanToDrafts = useCallback((items: MealPlanItem[]): Record<string, SlotDraft> => {
    const drafts: Record<string, SlotDraft> = {};
    for (const item of items) {
      drafts[toKey(item.date, item.meal_type)] = {
        itemId: item.id,
        recipeId: item.recipe_id || undefined,
        servings: item.servings || 1,
      };
    }
    return drafts;
  }, []);

  const loadData = useCallback(
    async (mealPlanId: number) => {
      setLoading(true);
      try {
        const [plan, recipeList] = await Promise.all([
          mealPlanService.getMealPlan(mealPlanId),
          recipeService.getRecipes(0, 200),
        ]);
        setMealPlan(plan);
        setRecipes(recipeList);
        const mappedDrafts = mapPlanToDrafts(plan.items);
        setSlotDrafts(mappedDrafts);
        setBaselineDrafts(mappedDrafts);
      } catch (error) {
        console.error('Failed to load meal plan detail:', error);
        addToast('Could not load meal plan.', 'error');
        navigate('/meal-plans');
      } finally {
        setLoading(false);
      }
    },
    [addToast, mapPlanToDrafts, navigate]
  );

  useEffect(() => {
    if (!id) return;
    void loadData(Number(id));
  }, [id, loadData]);

  const updateDraft = (date: string, mealType: MealType, patch: Partial<SlotDraft>) => {
    const key = toKey(date, mealType);
    setSlotDrafts(prev => ({
      ...prev,
      [key]: {
        itemId: prev[key]?.itemId,
        recipeId: prev[key]?.recipeId,
        servings: prev[key]?.servings ?? 1,
        ...patch,
      },
    }));
  };

  const savePlanItems = async () => {
    if (!mealPlan) return;
    setSaving(true);
    try {
      const operations: Promise<unknown>[] = [];

      for (const date of days) {
        for (const mealType of MEAL_TYPES) {
          const key = toKey(date, mealType);
          const draft = slotDrafts[key];
          if (!draft) continue;

          if (draft.itemId && !draft.recipeId) {
            operations.push(mealPlanService.deleteMealPlanItem(mealPlan.id, draft.itemId));
            continue;
          }

          if (draft.itemId && draft.recipeId) {
            operations.push(
              mealPlanService.updateMealPlanItem(mealPlan.id, draft.itemId, {
                date,
                meal_type: mealType,
                servings: draft.servings,
                recipe_id: draft.recipeId,
              })
            );
            continue;
          }

          if (!draft.itemId && draft.recipeId) {
            operations.push(
              mealPlanService.addMealPlanItem(mealPlan.id, {
                date,
                meal_type: mealType,
                servings: draft.servings,
                recipe_id: draft.recipeId,
              })
            );
          }
        }
      }

      await Promise.all(operations);
      addToast('Meal plan saved.', 'success');
      await loadData(mealPlan.id);
    } catch (error) {
      console.error('Failed to save meal plan items:', error);
      addToast('Could not save meal plan changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutofill = async () => {
    if (!mealPlan) return;
    setAutoFilling(true);
    try {
      const result = await mealPlanService.autofill(mealPlan.id);
      addToast(result.message, 'success');
      await loadData(mealPlan.id);
    } catch (error) {
      console.error('Failed to autofill meal plan:', error);
      addToast('Could not autofill plan.', 'error');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleCreateList = async () => {
    if (!mealPlan) return;
    setCreatingList(true);
    try {
      const list = await mealPlanService.createGroceryList(mealPlan.id);
      addToast('Grocery list created from this plan.', 'success');
      navigate(`/grocery/${list.id}`);
    } catch (error) {
      console.error('Failed to create grocery list from meal plan:', error);
      addToast('Could not create grocery list.', 'error');
    } finally {
      setCreatingList(false);
    }
  };

  const handleSendEmail = async () => {
    if (!mealPlan) return;
    setSendingEmail(true);
    try {
      await notificationService.sendWeeklyMealPlanNotification(mealPlan.id);
      addToast('Weekly meal plan email sent.', 'success');
    } catch (error) {
      console.error('Failed to send weekly plan email:', error);
      addToast('Could not send weekly meal plan email.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleClearWeek = () => {
    setSlotDrafts(prev => {
      const nextDrafts: Record<string, SlotDraft> = {};
      for (const date of days) {
        for (const mealType of MEAL_TYPES) {
          const key = toKey(date, mealType);
          nextDrafts[key] = {
            itemId: prev[key]?.itemId,
            recipeId: undefined,
            servings: prev[key]?.servings ?? 1,
          };
        }
      }
      return nextDrafts;
    });
    addToast('Cleared all recipe assignments for this week.', 'info');
  };

  const handleClearDay = (date: string) => {
    setSlotDrafts(prev => {
      const nextDrafts = { ...prev };
      for (const mealType of MEAL_TYPES) {
        const key = toKey(date, mealType);
        nextDrafts[key] = {
          itemId: prev[key]?.itemId,
          recipeId: undefined,
          servings: prev[key]?.servings ?? 1,
        };
      }
      return nextDrafts;
    });
    addToast('Day cleared.', 'info');
  };

  const handleCopyPreviousWeek = async () => {
    if (!mealPlan) return;
    setCopyingPreviousWeek(true);
    try {
      const planList = await mealPlanService.getMealPlansPaginated({
        page: 1,
        pageSize: 25,
        sort: 'start_date',
        order: 'desc',
      });
      const previousPlanSummary = planList.items
        .filter(plan => plan.id !== mealPlan.id && plan.end_date < mealPlan.start_date)
        .sort((a, b) => (a.end_date < b.end_date ? 1 : -1))[0];

      if (!previousPlanSummary) {
        addToast('No previous plan found to copy from.', 'info');
        return;
      }

      const previousPlan = await mealPlanService.getMealPlan(previousPlanSummary.id);
      const weekdayMealMap = new Map<string, { recipeId: number; servings: number }>();
      for (const item of previousPlan.items) {
        if (!item.recipe_id) continue;
        const weekday = parseLocalIsoDate(item.date).getDay();
        weekdayMealMap.set(`${weekday}__${item.meal_type}`, {
          recipeId: item.recipe_id,
          servings: item.servings || 1,
        });
      }

      let copiedSlots = 0;
      setSlotDrafts(prev => {
        const nextDrafts = { ...prev };
        for (const date of days) {
          const weekday = parseLocalIsoDate(date).getDay();
          for (const mealType of MEAL_TYPES) {
            const source = weekdayMealMap.get(`${weekday}__${mealType}`);
            if (!source) continue;
            const key = toKey(date, mealType);
            nextDrafts[key] = {
              itemId: prev[key]?.itemId,
              recipeId: source.recipeId,
              servings: source.servings,
            };
            copiedSlots += 1;
          }
        }
        return nextDrafts;
      });

      if (copiedSlots === 0) {
        addToast('Previous plan had no matching recipe slots to copy.', 'info');
        return;
      }

      addToast(
        `Copied ${copiedSlots} slot${copiedSlots === 1 ? '' : 's'} from ${previousPlanSummary.name || 'your previous plan'}.`,
        'success'
      );
    } catch (error) {
      console.error('Failed to copy previous week:', error);
      addToast('Could not copy from previous plan.', 'error');
    } finally {
      setCopyingPreviousWeek(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
        ></div>
      </div>
    );
  }

  if (!mealPlan) {
    return null;
  }

  return (
    <div>
      <button className="btn-ghost mb-3 -ml-2" onClick={() => navigate('/meal-plans')}>
        <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
        Back to plans
      </button>

      <PageHeader
        badge={
          <span className="badge">
            {formatLocalDate(mealPlan.start_date)} – {formatLocalDate(mealPlan.end_date)}
          </span>
        }
        title={mealPlan.name || 'Weekly Planner'}
        subtitle={
          mealPlan.theme
            ? `Theme: ${mealPlan.theme} · Assign breakfast, lunch, and dinner slots or autofill open days.`
            : `${formatLocalDate(mealPlan.start_date)} - ${formatLocalDate(mealPlan.end_date)}`
        }
        actions={
          <InlineStatus
            tone={hasUnsavedChanges ? 'warning' : 'success'}
            label={hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          />
        }
      />

      {/* Streamlined Command Toolbar */}
      <SectionCard className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Primary Workflow Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="btn-primary"
              disabled={saving || !hasUnsavedChanges}
              onClick={savePlanItems}
            >
              {saving ? 'Saving...' : hasUnsavedChanges ? 'Save changes' : 'Saved'}
            </button>
            <button
              className="btn-secondary"
              disabled={autoFilling || saving}
              onClick={handleAutofill}
            >
              <SparklesIcon className="h-4 w-4 mr-1.5 text-[#C84B31]" />
              {autoFilling ? 'Autofilling...' : 'Autofill open slots'}
            </button>
            <button
              className="btn-secondary border-[#3F624D]/35 bg-[#ECF5F0]/80 text-[#2F6F4E] hover:border-[#3F624D]/60 hover:bg-[#ECF5F0]"
              disabled={creatingList || saving}
              onClick={handleCreateList}
            >
              <ShoppingCartIcon className="h-4 w-4 mr-1.5 text-[#2F6F4E]" />
              {creatingList ? 'Building list...' : 'Build grocery list'}
            </button>
          </div>

          {/* Secondary Plan Utilities */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[#E7E0D6] pt-3 lg:border-t-0 lg:pt-0">
            <button
              className="btn-ghost"
              disabled={copyingPreviousWeek || saving}
              onClick={handleCopyPreviousWeek}
            >
              {copyingPreviousWeek ? 'Copying...' : 'Copy previous week'}
            </button>
            <button
              className="btn-ghost"
              disabled={sendingEmail || saving}
              onClick={handleSendEmail}
            >
              <EnvelopeIcon className="h-4 w-4 mr-1" />
              {sendingEmail ? 'Sending...' : 'Email this plan'}
            </button>
            <button
              className="btn-ghost text-[#B91C1C] hover:bg-[#FEE2E2]/60 hover:text-[#991B1B]"
              disabled={saving}
              onClick={handleClearWeek}
            >
              Clear week
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Editorial Plan Health Ribbon */}
      <SectionCard
        className="mb-6"
        title="Plan health"
        subtitle="Coverage, variety, and speed balance for this week"
        action={
          <span className="font-mono text-xs font-medium text-[#78716C] tabular-nums">
            {planHealth.filledSlots} of {planHealth.totalSlots} slots planned
          </span>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <StatPill
            label="Health score"
            value={`${planHealth.score}/100`}
            tone={planHealth.score >= 75 ? 'success' : planHealth.score >= 50 ? 'warm' : 'default'}
          />
          <StatPill
            label="Coverage"
            value={`${Math.round(planHealth.coverageRatio * 100)}%`}
            tone="success"
          />
          <StatPill
            label="Quick meals"
            value={`${Math.round(planHealth.quickMealRatio * 100)}%`}
            tone="warm"
          />
        </div>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EFE6]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, planHealth.score))}%`,
                backgroundColor:
                  planHealth.score >= 75
                    ? 'var(--secondary)'
                    : planHealth.score >= 50
                      ? 'var(--primary)'
                      : 'var(--warning)',
              }}
            />
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-[#57534E]">
          {planHealth.guidance.map(item => (
            <li
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E0D6] bg-[#FAF7F2] px-3 py-1.5 font-medium"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#C84B31]" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Interactive 7-Day Week Navigation Strip */}
      {days.length > 0 && (
        <div
          className="mb-6 surface-muted p-3 sm:p-4"
          role="region"
          aria-label="Week schedule navigation"
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedDay('all')}
              aria-pressed={selectedDay === 'all'}
              className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left transition-all duration-150 ${
                selectedDay === 'all'
                  ? 'border-[#C84B31] bg-white font-semibold text-[#1C1917] shadow-xs'
                  : 'border-transparent bg-transparent text-[#57534E] hover:bg-white/70 hover:text-[#1C1917]'
              }`}
            >
              <span className="block text-xs uppercase tracking-wider text-[#78716C]">View</span>
              <span className="text-sm font-semibold">All Days ({days.length})</span>
            </button>

            {days.map(date => {
              const isSelected = selectedDay === date;
              const weekdayShort = formatLocalDate(date, { weekday: 'short' });
              const dayNum = formatLocalDate(date, { month: 'short', day: 'numeric' });
              const slotStates = MEAL_TYPES.map(mealType =>
                Boolean(slotDrafts[toKey(date, mealType)]?.recipeId)
              );
              const filledCount = slotStates.filter(Boolean).length;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDay(prev => (prev === date ? 'all' : date))}
                  aria-pressed={isSelected}
                  className={`shrink-0 min-w-[6.25rem] rounded-2xl border px-3.5 py-2 text-left transition-all duration-150 ${
                    isSelected
                      ? 'border-[#C84B31] bg-white text-[#1C1917] shadow-xs'
                      : 'border-[#E7E0D6] bg-white/60 text-[#57534E] hover:border-[#D6CEC2] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C]">
                      {weekdayShort}
                    </span>
                    <span className="font-mono text-[10px] text-[#78716C] tabular-nums">
                      {filledCount}/3
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-[#1C1917]">{dayNum}</p>
                  <div className="mt-1.5 flex items-center gap-1" aria-hidden="true">
                    {slotStates.map((filled, idx) => (
                      <span
                        key={MEAL_TYPES[idx]}
                        className={`h-1.5 w-3.5 rounded-full transition-colors ${
                          filled ? 'bg-[#3F624D]' : 'bg-[#E7E0D6]'
                        }`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Schedule Cards */}
      <div className="space-y-5">
        {visibleDays.map(date => (
          <SectionCard
            key={date}
            title={
              <span className="inline-flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-[#C84B31]" />
                <span>
                  {formatLocalDate(date, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </span>
            }
            action={
              <button className="btn-ghost text-xs" onClick={() => handleClearDay(date)}>
                Clear day
              </button>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              {MEAL_TYPES.map(mealType => {
                const key = toKey(date, mealType);
                const draft = slotDrafts[key] || { servings: 1 };
                const selectedRecipe = draft.recipeId ? recipeById.get(draft.recipeId) : undefined;
                const selectedRecipeCount = draft.recipeId
                  ? (recipeUsageCounts[draft.recipeId] ?? 0)
                  : 0;
                const totalTime = selectedRecipe
                  ? (selectedRecipe.prep_time_minutes || 0) +
                    (selectedRecipe.cook_time_minutes || 0)
                  : 0;

                return (
                  <div
                    key={key}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                      selectedRecipe
                        ? 'border-[#D6CEC2] bg-[#FAF7F2]/80'
                        : 'border-[#E7E0D6] bg-white'
                    }`}
                  >
                    <div>
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <span className="eyebrow">{MEAL_TYPE_LABELS[mealType]}</span>
                        {selectedRecipe && (
                          <span className="inline-flex items-center rounded-full bg-[#ECF5F0] px-2 py-0.5 text-[11px] font-semibold text-[#2F6F4E]">
                            Planned
                          </span>
                        )}
                      </div>

                      <select
                        className="input"
                        aria-label={`${MEAL_TYPE_LABELS[mealType]} recipe for ${date}`}
                        value={draft.recipeId ?? ''}
                        onChange={e =>
                          updateDraft(date, mealType, {
                            recipeId: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      >
                        <option value="">No recipe</option>
                        {recipes.map(recipe => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.name}
                          </option>
                        ))}
                      </select>

                      {/* Selected Recipe Preview Enhancement */}
                      {selectedRecipe && (
                        <div className="mt-3 rounded-xl border border-[#E7E0D6] bg-white p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {totalTime > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EFE6] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#57534E] tabular-nums">
                                <ClockIcon className="h-3 w-3 text-[#78716C]" />
                                {totalTime} min
                              </span>
                            )}
                            {selectedRecipe.tags?.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full border border-[#E7E0D6] bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-medium text-[#57534E]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <Link
                              to={`/recipes/${selectedRecipe.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#C84B31] hover:text-[#B83B22]"
                            >
                              <span>View recipe</span>
                              <ArrowRightIcon className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#E7E0D6]/80">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-medium text-[#57534E]">Servings</label>
                        <input
                          type="number"
                          min={1}
                          className="input w-20 py-1.5 text-center font-mono text-xs tabular-nums"
                          value={draft.servings}
                          onChange={e =>
                            updateDraft(date, mealType, {
                              servings: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />
                      </div>

                      {draft.recipeId && selectedRecipeCount >= 3 && (
                        <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-[#B45309]/25 bg-[#FEF3C7] px-2.5 py-1.5 text-xs font-medium text-[#92400E]">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0 text-[#92400E]" />
                          <p>Repeated {selectedRecipeCount.toString()} times this week.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
