import type { PantryItem } from '../types';
import { daysFromToday, formatLocalDate } from './date';

export type ExpiryState = 'expired' | 'soon' | 'fresh' | 'none';

export const USE_SOON_DAYS = 3;

export function expiryState(item: Pick<PantryItem, 'expires_at'>): ExpiryState {
  if (!item.expires_at) return 'none';
  const days = daysFromToday(item.expires_at);
  if (days < 0) return 'expired';
  if (days <= USE_SOON_DAYS) return 'soon';
  return 'fresh';
}

export function expiryLabel(item: Pick<PantryItem, 'expires_at'>): string {
  if (!item.expires_at) return 'No expiry date';
  const days = daysFromToday(item.expires_at);
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Use today';
  if (days === 1) return 'Use by tomorrow';
  if (days <= USE_SOON_DAYS) return `Use within ${days} days`;
  return `Good until ${formatLocalDate(item.expires_at, { month: 'short', day: 'numeric' })}`;
}

export function generateHref(names: string[]): string {
  return `/generate?use=${names.map(name => encodeURIComponent(name)).join(',')}`;
}
