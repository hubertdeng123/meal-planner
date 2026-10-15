import type { GroceryItem, GroceryItemCreate } from '../types';
import { formatQuantity } from './recipe';

export const AISLE_ORDER = ['Produce', 'Meat & Seafood', 'Dairy', 'Pantry', 'Other'] as const;
export const DEFAULT_AISLE = 'Other';

const UNITS = new Set([
  'g',
  'kg',
  'mg',
  'oz',
  'lb',
  'lbs',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'cups',
  'pt',
  'qt',
  'gal',
  'can',
  'cans',
  'jar',
  'jars',
  'pack',
  'packs',
  'bag',
  'bags',
  'box',
  'boxes',
  'bunch',
  'bunches',
  'clove',
  'cloves',
  'head',
  'heads',
  'dozen',
  'loaf',
  'loaves',
  'bottle',
  'bottles',
  'pc',
  'pcs',
  'piece',
  'pieces',
  'slice',
  'slices',
  'stick',
  'sticks',
  'pinch',
]);

function parseNumber(token: string): number | null {
  const fraction = token.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator ? Number(fraction[1]) / denominator : null;
  }
  const value = Number(token.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** "2 lb chicken thighs" -> { quantity: 2, unit: "lb", name: "chicken thighs" }. */
export function parseQuickAdd(input: string): GroceryItemCreate | null {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let quantity: number | undefined;
  let unit: string | undefined;
  const first = tokens[0].match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)([a-zA-Z]+)?$/);
  if (first && tokens.length > 1) {
    quantity = parseNumber(first[1]) ?? undefined;
    if (quantity !== undefined) {
      tokens.shift();
      if (first[2] && UNITS.has(first[2].toLowerCase())) unit = first[2].toLowerCase();
      else if (first[2]) tokens.unshift(first[2]);
    }
  }
  if (quantity !== undefined && !unit && tokens.length > 1 && UNITS.has(tokens[0].toLowerCase())) {
    unit = tokens.shift()!.toLowerCase();
  }
  if (tokens[0]?.toLowerCase() === 'of' && unit) tokens.shift();

  const name = tokens.join(' ').trim();
  if (!name) return null;
  return { name, quantity, unit };
}

export function formatItemAmount(item: Pick<GroceryItem, 'quantity' | 'unit'>): string {
  const quantity = item.quantity && item.quantity > 0 ? formatQuantity(item.quantity) : '';
  return [quantity, item.unit?.trim()].filter(Boolean).join(' ');
}

export function aisleOf(item: Pick<GroceryItem, 'category'>): string {
  return item.category?.trim() || DEFAULT_AISLE;
}

function aisleRank(aisle: string): number {
  const index = (AISLE_ORDER as readonly string[]).indexOf(aisle);
  return index === -1 ? AISLE_ORDER.length - 1 : index;
}

export function groupByAisle(items: GroceryItem[]): Array<{ aisle: string; items: GroceryItem[] }> {
  const groups = new Map<string, GroceryItem[]>();
  for (const item of items) {
    const aisle = aisleOf(item);
    groups.set(aisle, [...(groups.get(aisle) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => aisleRank(a) - aisleRank(b) || a.localeCompare(b))
    .map(([aisle, entries]) => ({
      aisle,
      items: entries.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
