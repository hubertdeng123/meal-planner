import { describe, expect, it } from 'vitest';

import { formatLocalDate, parseLocalIsoDate } from '../date';

describe('date utils', () => {
  it('parses an ISO local date without timezone shifting day values', () => {
    const parsed = parseLocalIsoDate('2026-02-08');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(8);
  });

  it('formats an ISO local date using locale options', () => {
    const formatted = formatLocalDate(
      '2026-02-08',
      { year: 'numeric', month: 'short', day: 'numeric' },
      'en-US'
    );

    expect(formatted).toContain('2026');
  });
});
