export function parseLocalIsoDate(value: string): Date {
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const parseLocalDate = parseLocalIsoDate;

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
