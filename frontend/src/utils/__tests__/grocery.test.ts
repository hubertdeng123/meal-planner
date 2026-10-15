import { describe, it, expect } from 'vitest';
import { formatItemAmount, groupByAisle, isValidEmail, parseQuickAdd } from '../grocery';
import type { GroceryItem } from '../../types';

describe('parseQuickAdd', () => {
  it.each([
    ['milk', { name: 'milk', quantity: undefined, unit: undefined }],
    ['2 eggs', { name: 'eggs', quantity: 2, unit: undefined }],
    ['2 lb chicken thighs', { name: 'chicken thighs', quantity: 2, unit: 'lb' }],
    ['500g flour', { name: 'flour', quantity: 500, unit: 'g' }],
    ['1/2 cup of sugar', { name: 'sugar', quantity: 0.5, unit: 'cup' }],
    ['1.5 Kg potatoes', { name: 'potatoes', quantity: 1.5, unit: 'kg' }],
    ['7up', { name: '7up', quantity: undefined, unit: undefined }],
    ['3 bunch', { name: 'bunch', quantity: 3, unit: undefined }],
  ])('parses %s', (input, expected) => {
    expect(parseQuickAdd(input)).toEqual(expected);
  });

  it('returns null for blank input', () => {
    expect(parseQuickAdd('   ')).toBeNull();
  });
});

describe('grocery helpers', () => {
  const item = (name: string, category?: string): GroceryItem => ({
    id: name.length,
    grocery_list_id: 1,
    name,
    category,
    checked: false,
  });

  it('groups by aisle in store order with unknown aisles last', () => {
    const groups = groupByAisle([
      item('rice', 'Pantry'),
      item('tofu'),
      item('kale', 'Produce'),
      item('apples', 'Produce'),
      item('wine', 'Drinks'),
    ]);
    expect(groups.map(group => group.aisle)).toEqual(['Produce', 'Pantry', 'Drinks', 'Other']);
    expect(groups[0].items.map(entry => entry.name)).toEqual(['apples', 'kale']);
  });

  it('formats amounts and validates emails', () => {
    expect(formatItemAmount({ quantity: 0.25, unit: 'cup' })).toBe('¼ cup');
    expect(formatItemAmount({ quantity: undefined, unit: undefined })).toBe('');
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('nope@')).toBe(false);
  });
});
