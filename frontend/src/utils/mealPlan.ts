import type { MealPlanItem, MealType } from '../types';

export const PLAN_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function slotKey(date: string, mealType: string): string {
  return `${date.slice(0, 10)}|${mealType.toLowerCase()}`;
}

export function indexItems(items: MealPlanItem[]): Map<string, MealPlanItem> {
  const map = new Map<string, MealPlanItem>();
  for (const item of items) {
    map.set(slotKey(item.date, item.meal_type), item);
  }
  return map;
}

export function itemRecipeName(item: MealPlanItem): string | null {
  if (item.recipe?.name) return item.recipe.name;
  const name = item.recipe_data?.name;
  return typeof name === 'string' && name.trim() ? name : null;
}

export interface PlanHealth {
  score: number;
  filled: number;
  total: number;
  coverage: number;
  variety: number;
  quick: number;
  tip: string;
}

export function computePlanHealth(
  dates: string[],
  slots: Map<string, MealPlanItem>,
  recipeMinutes: (recipeId: number) => number | null
): PlanHealth {
  const total = dates.length * PLAN_MEAL_TYPES.length;
  const ids: number[] = [];
  let quickCount = 0;
  for (const date of dates) {
    for (const meal of PLAN_MEAL_TYPES) {
      const recipeId = slots.get(slotKey(date, meal))?.recipe_id;
      if (!recipeId) continue;
      ids.push(recipeId);
      const minutes = recipeMinutes(recipeId);
      if (minutes && minutes <= 30) quickCount += 1;
    }
  }
  const filled = ids.length;
  const coverage = total ? filled / total : 0;
  const variety = filled ? new Set(ids).size / filled : 0;
  const quick = filled ? quickCount / filled : 0;
  const score = Math.round(coverage * 50 + variety * 30 + quick * 20);

  let tip = 'Balanced week. Build the grocery list when you are ready.';
  if (filled === 0) tip = 'Tap a slot to add a recipe, or autofill the week.';
  else if (coverage < 0.8) tip = `${total - filled} open slots left.`;
  else if (variety < 0.55) tip = 'Lots of repeats. Swap in something new.';
  else if (quick < 0.3) tip = 'Add a few 30-minute meals for busy nights.';

  return { score, filled, total, coverage, variety, quick, tip };
}
