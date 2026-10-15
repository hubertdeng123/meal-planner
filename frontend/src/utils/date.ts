export function parseLocalIsoDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalDate(
  value: string,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  return parseLocalIsoDate(value).toLocaleDateString(locale, options);
}

export function todayIso(): string {
  return toLocalIsoDate(new Date());
}

export function addDaysIso(value: string, days: number): string {
  const date = parseLocalIsoDate(value);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

/** Every YYYY-MM-DD from `start` to `end`, inclusive. */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start.slice(0, 10);
  const last = end.slice(0, 10);
  while (cursor <= last) {
    dates.push(cursor);
    cursor = addDaysIso(cursor, 1);
  }
  return dates;
}

/** Monday-to-Sunday week containing `value`. */
export function getWeekRange(value: Date = new Date()): { start_date: string; end_date: string } {
  const monday = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const start = toLocalIsoDate(monday);
  return { start_date: start, end_date: addDaysIso(start, 6) };
}

/** Whole days from today until `value` (negative when in the past). */
export function daysFromToday(value: string): number {
  const target = parseLocalIsoDate(value);
  const today = parseLocalIsoDate(todayIso());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatRange(start: string, end: string): string {
  const startDate = parseLocalIsoDate(start);
  const endDate = parseLocalIsoDate(end);
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const startLabel = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = endDate.toLocaleDateString(
    undefined,
    sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' }
  );
  return `${startLabel} – ${endLabel}`;
}

export function formatRelativeDay(value: string): string {
  const diff = daysFromToday(value);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatLocalDate(value, { weekday: 'short', month: 'short', day: 'numeric' });
}
