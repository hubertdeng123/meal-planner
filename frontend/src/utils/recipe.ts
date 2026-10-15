import type { NutritionFacts, Recipe } from '../types';

export interface IngredientLike {
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
}

export function totalMinutes(recipe: {
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
}): number {
  return (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

const FRACTIONS: Array<[number, string]> = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
];

/** Kitchen-friendly quantity: 0.5 -> "½", 1.25 -> "1¼", 2.4 -> "2.4". */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const whole = Math.floor(value);
  const fraction = value - whole;
  if (fraction < 0.02) return String(whole);
  if (fraction > 0.98) return String(whole + 1);
  const match = FRACTIONS.find(([amount]) => Math.abs(amount - fraction) < 0.03);
  if (match) return `${whole || ''}${match[1]}`;
  return String(Math.round(value * 10) / 10);
}

export function formatAmount(ingredient: IngredientLike, scale = 1): string {
  const quantity =
    typeof ingredient.quantity === 'number' && ingredient.quantity > 0
      ? formatQuantity(ingredient.quantity * scale)
      : '';
  return [quantity, ingredient.unit?.trim()].filter(Boolean).join(' ');
}

const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo'];

export function hasTag(recipe: Pick<Recipe, 'tags'>, tag: string): boolean {
  const needle = tag.toLowerCase();
  return recipe.tags.some(value => value.toLowerCase().replace(/\s+/g, '-').includes(needle));
}

export function dietaryTags(recipe: Pick<Recipe, 'tags'>): string[] {
  return DIETARY_TAGS.filter(tag => hasTag(recipe, tag));
}

export function isQuick(recipe: Pick<Recipe, 'prep_time_minutes' | 'cook_time_minutes'>): boolean {
  const minutes = totalMinutes(recipe);
  return minutes > 0 && minutes <= 30;
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function hasNutrition(nutrition?: NutritionFacts | null): boolean {
  return Boolean(nutrition && Object.values(nutrition).some(value => typeof value === 'number'));
}
