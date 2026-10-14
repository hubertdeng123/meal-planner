import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModalShell } from '../ui/ModalShell';
import { ChoiceChips } from '../ui/ChoiceChips';
import { Stepper } from '../ui/Stepper';
import { Spinner } from '../ui/PageLoader';
import { CalendarDaysIcon, CheckCircleSolidIcon } from '../ui/AppIcons';
import { useToast } from '../../contexts/ToastContext';
import mealPlanService from '../../services/mealPlan.service';
import type { MealPlan, MealPlanList, MealType, Recipe } from '../../types';
import {
  formatLocalDate,
  formatRange,
  getDateRange,
  getWeekRange,
  todayIso,
} from '../../utils/date';
import { capitalize } from '../../utils/recipe';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];

interface AddToPlanDialogProps {
  recipe: Pick<Recipe, 'id' | 'name' | 'servings'>;
  onClose: () => void;
}

export function AddToPlanDialog({ recipe, onClose }: AddToPlanDialogProps) {
  const { addToast } = useToast();
  const today = todayIso();
  const [plans, setPlans] = useState<MealPlanList[] | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [date, setDate] = useState(today);
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [servings, setServings] = useState(recipe.servings || 2);
  const [saving, setSaving] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    mealPlanService
      .getMealPlansPaginated({ page: 1, pageSize: 20, sort: 'start_date', order: 'desc' })
      .then(result => {
        if (cancelled) return;
        const upcoming = result.items
          .filter(item => item.end_date >= today)
          .sort((a, b) => a.start_date.localeCompare(b.start_date));
        setPlans(upcoming);
        setPlanId(upcoming[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, [today]);

  useEffect(() => {
    if (planId === null) return;
    let cancelled = false;
    mealPlanService
      .getMealPlan(planId)
      .then(detail => {
        if (cancelled) return;
        setPlan(detail);
        const days = getDateRange(detail.start_date, detail.end_date).filter(day => day >= today);
        setDate(current => (days.includes(current) ? current : (days[0] ?? detail.start_date)));
      })
      .catch(() => {
        if (!cancelled) setPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, today]);

  const days = useMemo(
    () =>
      plan && plan.id === planId
        ? getDateRange(plan.start_date, plan.end_date).filter(day => day >= today)
        : [],
    [plan, planId, today]
  );

  const occupant = plan?.items.find(item => item.date === date && item.meal_type === mealType);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (planId === null) {
        const week = getWeekRange();
        const created = await mealPlanService.createMealPlan({
          name: `Week of ${formatLocalDate(week.start_date, { month: 'short', day: 'numeric' })}`,
          ...week,
          items: [{ date: today, meal_type: mealType, servings, recipe_id: recipe.id }],
        });
        setSavedPlanId(created.id);
      } else if (occupant) {
        await mealPlanService.updateMealPlanItem(planId, occupant.id, {
          date,
          meal_type: mealType,
          servings,
          recipe_id: recipe.id,
        });
        setSavedPlanId(planId);
      } else {
        await mealPlanService.addMealPlanItem(planId, {
          date,
          meal_type: mealType,
          servings,
          recipe_id: recipe.id,
        });
        setSavedPlanId(planId);
      }
      addToast('Added to your plan.', 'success');
    } catch (error) {
      console.error('Failed to add recipe to plan:', error);
      addToast('Could not add that to your plan. Try again?', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (savedPlanId !== null) {
    return (
      <ModalShell size="sm" onClose={onClose} hideCloseButton>
        <div className="py-6 text-center">
          <CheckCircleSolidIcon className="mx-auto h-10 w-10 text-primary animate-bounce-in" />
          <h3 className="mt-3 font-display text-xl font-semibold text-stone-900">On the menu</h3>
          <p className="mt-1 text-sm text-stone-600">
            {recipe.name} is planned for{' '}
            {formatLocalDate(planId === null ? today : date, { weekday: 'long' })} {mealType}.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Done
            </button>
            <Link to={`/meal-plans/${savedPlanId}`} className="btn-primary">
              Open plan
            </Link>
          </div>
        </div>
      </ModalShell>
    );
  }

  const loadingPlans = plans === null;
  const noPlans = plans !== null && plans.length === 0;

  return (
    <ModalShell
      size="md"
      title="Add to meal plan"
      description={recipe.name}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving || loadingPlans || (planId !== null && days.length === 0)}
            onClick={handleSave}
          >
            {saving && <Spinner className="h-4 w-4" />}
            {noPlans ? 'Start this week’s plan' : occupant ? 'Replace meal' : 'Add to plan'}
          </button>
        </>
      }
    >
      {loadingPlans ? (
        <div className="space-y-3 py-2" role="status" aria-label="Loading plans">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-8 w-2/3" />
        </div>
      ) : (
        <div className="space-y-5 py-1">
          {noPlans ? (
            <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-4">
              <CalendarDaysIcon className="mt-0.5 h-5 w-5 text-stone-400" />
              <p className="text-sm text-stone-600">
                You don’t have a plan for this week yet. We’ll start one for{' '}
                {formatRange(getWeekRange().start_date, getWeekRange().end_date)} and put this on
                today’s menu.
              </p>
            </div>
          ) : (
            <>
              {plans.length > 1 && (
                <ChoiceChips
                  label="Plan"
                  size="sm"
                  options={plans.map(item => ({
                    value: String(item.id),
                    label: item.name || formatRange(item.start_date, item.end_date),
                  }))}
                  value={String(planId)}
                  onChange={value => setPlanId(Number(value))}
                />
              )}
              {days.length > 0 ? (
                <ChoiceChips
                  label="Day"
                  size="sm"
                  options={days.map(day => ({
                    value: day,
                    label:
                      day === today
                        ? 'Today'
                        : formatLocalDate(day, { weekday: 'short', day: 'numeric' }),
                  }))}
                  value={date}
                  onChange={setDate}
                />
              ) : (
                <div className="skeleton h-8 w-full" />
              )}
            </>
          )}
          <ChoiceChips
            label="Meal"
            size="sm"
            options={MEALS.map(value => ({ value, label: capitalize(value) }))}
            value={mealType}
            onChange={setMealType}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">Servings</p>
            <Stepper label="Servings" value={servings} onChange={setServings} max={20} />
          </div>
          {occupant && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Replaces {occupant.recipe?.name || 'the meal already planned'} in this slot.
            </p>
          )}
        </div>
      )}
    </ModalShell>
  );
}
