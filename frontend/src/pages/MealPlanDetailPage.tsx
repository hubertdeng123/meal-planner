import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ShoppingCartIcon,
  EnvelopeIcon,
} from '../components/ui/AppIcons';

import { InlineStatus } from '../components/ui/InlineStatus';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { useToast } from '../contexts/ToastContext';
import mealPlanService from '../services/mealPlan.service';
import notificationService from '../services/notification.service';
import recipeService from '../services/recipe.service';
import type { MealPlan, MealPlanItem, MealType, Recipe } from '../types';

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

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(start);
  const endDate = new Date(end);
  while (cursor <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!id) return;
    void loadData(Number(id));
  }, [id]);

  const days = useMemo(() => {
    if (!mealPlan) return [];
    return getDateRange(mealPlan.start_date, mealPlan.end_date);
  }, [mealPlan]);

  const hasUnsavedChanges = useMemo(
    () => serializeDrafts(slotDrafts) !== serializeDrafts(baselineDrafts),
    [slotDrafts, baselineDrafts]
  );

  const loadData = async (mealPlanId: number) => {
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
  };

  const mapPlanToDrafts = (items: MealPlanItem[]): Record<string, SlotDraft> => {
    const drafts: Record<string, SlotDraft> = {};
    for (const item of items) {
      drafts[toKey(item.date, item.meal_type)] = {
        itemId: item.id,
        recipeId: item.recipe_id || undefined,
        servings: item.servings || 1,
      };
    }
    return drafts;
  };

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
      <button className="btn-secondary mb-4" onClick={() => navigate('/meal-plans')}>
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to plans
      </button>

      <PageHeader
        title={mealPlan.name || 'Weekly Planner'}
        subtitle={`${new Date(mealPlan.start_date).toLocaleDateString()} - ${new Date(mealPlan.end_date).toLocaleDateString()}`}
      />

      <SectionCard className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
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
            <SparklesIcon className="h-4 w-4 mr-2" />
            {autoFilling ? 'Autofilling...' : 'Autofill open slots'}
          </button>
          <button
            className="btn-secondary"
            disabled={creatingList || saving}
            onClick={handleCreateList}
          >
            <ShoppingCartIcon className="h-4 w-4 mr-2" />
            {creatingList ? 'Building list...' : 'Build grocery list'}
          </button>
          <button
            className="btn-secondary"
            disabled={sendingEmail || saving}
            onClick={handleSendEmail}
          >
            <EnvelopeIcon className="h-4 w-4 mr-2" />
            {sendingEmail ? 'Sending...' : 'Email this plan'}
          </button>
          <InlineStatus
            className="ml-auto"
            tone={hasUnsavedChanges ? 'warning' : 'success'}
            label={hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          />
        </div>
      </SectionCard>

      <div className="space-y-4">
        {days.map(date => (
          <SectionCard
            key={date}
            title={
              <span className="inline-flex items-center">
                <CalendarDaysIcon className="mr-2 h-5 w-5 text-stone-500" />
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              {MEAL_TYPES.map(mealType => {
                const key = toKey(date, mealType);
                const draft = slotDrafts[key] || { servings: 1 };
                return (
                  <div key={key} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
                      {mealType}
                    </p>
                    <select
                      className="input"
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
                    <div className="mt-3">
                      <label className="block text-xs text-stone-500 mb-1">Servings</label>
                      <input
                        type="number"
                        min={1}
                        className="input"
                        value={draft.servings}
                        onChange={e =>
                          updateDraft(date, mealType, {
                            servings: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
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
