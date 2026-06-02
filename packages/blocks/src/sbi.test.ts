import { describe, expect, it } from 'vitest';

import { elapsedDays, isOverEstimate, isStale } from './sbi.js';

describe('isOverEstimate', () => {
  it('flags when actual exceeds estimate', () => {
    expect(isOverEstimate({ estimateHours: 4, actualHours: 6 })).toBe(true);
    expect(isOverEstimate({ estimateHours: 4, actualHours: 4 })).toBe(false);
  });
  it('returns null without both numbers', () => {
    expect(isOverEstimate({ estimateHours: 4 })).toBeNull();
    expect(isOverEstimate({})).toBeNull();
  });
});

describe('isStale', () => {
  const now = new Date('2026-01-10T00:00:00Z');
  it('flags in_progress older than the threshold', () => {
    expect(isStale({ status: 'in_progress', startedAt: '2026-01-04T00:00:00Z' }, now)).toBe(true);
    expect(isStale({ status: 'in_progress', startedAt: '2026-01-09T00:00:00Z' }, now)).toBe(false);
  });
  it('returns null when not in_progress or no startedAt', () => {
    expect(isStale({ status: 'done', startedAt: '2026-01-01T00:00:00Z' }, now)).toBeNull();
    expect(isStale({ status: 'in_progress' }, now)).toBeNull();
  });
});

describe('elapsedDays', () => {
  const now = new Date('2026-01-10T00:00:00Z');
  it('counts days from startedAt to now when not completed', () => {
    expect(elapsedDays({ startedAt: '2026-01-07T00:00:00Z' }, now)).toBe(3);
  });
  it('counts actual duration to completedAt when completed', () => {
    expect(
      elapsedDays({ startedAt: '2026-01-07T00:00:00Z', completedAt: '2026-01-08T12:00:00Z' }, now),
    ).toBe(1);
  });
  it('returns null without startedAt or with an invalid date', () => {
    expect(elapsedDays({}, now)).toBeNull();
    expect(elapsedDays({ startedAt: 'not-a-date' }, now)).toBeNull();
  });
  it('never returns negative', () => {
    expect(elapsedDays({ startedAt: '2026-01-15T00:00:00Z' }, now)).toBe(0);
  });
});
