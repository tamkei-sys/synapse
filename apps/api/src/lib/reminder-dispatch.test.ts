import { describe, expect, it } from 'vitest';

import { nextOccurrence } from './reminder-dispatch.js';

describe('nextOccurrence', () => {
  const base = new Date('2026-03-15T09:00:00.000Z');

  it('returns null for none / unknown', () => {
    expect(nextOccurrence(base, 'none')).toBeNull();
    expect(nextOccurrence(base, 'whatever')).toBeNull();
  });

  it('adds one day for daily', () => {
    expect(nextOccurrence(base, 'daily')?.toISOString()).toBe('2026-03-16T09:00:00.000Z');
  });

  it('adds one week for weekly', () => {
    expect(nextOccurrence(base, 'weekly')?.toISOString()).toBe('2026-03-22T09:00:00.000Z');
  });

  it('adds one month for monthly', () => {
    expect(nextOccurrence(base, 'monthly')?.toISOString()).toBe('2026-04-15T09:00:00.000Z');
  });

  it('does not mutate the input date', () => {
    const before = base.getTime();
    nextOccurrence(base, 'daily');
    expect(base.getTime()).toBe(before);
  });
});
