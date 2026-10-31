import { describe, expect, it } from 'vitest';
import { formatDay, israelDayBoundary } from './dates';

describe('israelDayBoundary', () => {
  it('uses the Israeli offset (summer +3, winter +2)', () => {
    expect(israelDayBoundary('2026-07-01').toISOString()).toBe('2026-06-30T21:00:00.000Z');
    expect(israelDayBoundary('2026-12-01').toISOString()).toBe('2026-11-30T22:00:00.000Z');
    expect(israelDayBoundary('2026-12-01', true).toISOString()).toBe('2026-12-01T21:59:59.999Z');
  });
  it('formats date-only values without shifting', () => {
    expect(formatDay('2026-09-12')).toBe('12.09.2026');
  });
});
