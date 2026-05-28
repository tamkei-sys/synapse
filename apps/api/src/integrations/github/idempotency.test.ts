import { describe, expect, it } from 'vitest';

import { InMemoryIdempotencyStore } from './idempotency.js';

describe('InMemoryIdempotencyStore', () => {
  it('records a new id once', async () => {
    const s = new InMemoryIdempotencyStore();
    expect(await s.remember('a', 60_000)).toBe(true);
    expect(await s.remember('a', 60_000)).toBe(false);
  });

  it('treats expired entries as new', async () => {
    const s = new InMemoryIdempotencyStore();
    expect(await s.remember('a', 0)).toBe(true);
    // 0ms TTL → immediately stale.
    await new Promise((r) => setTimeout(r, 5));
    expect(await s.remember('a', 60_000)).toBe(true);
  });

  it('evicts the oldest entry past capacity', async () => {
    const s = new InMemoryIdempotencyStore(2);
    await s.remember('a', 60_000);
    await s.remember('b', 60_000);
    await s.remember('c', 60_000); // capacity hit → 'a' evicted, store=[b,c]
    expect(await s.remember('a', 60_000)).toBe(true); // 'a' is new again, evicts 'b'
    expect(await s.remember('c', 60_000)).toBe(false); // 'c' still in store
    expect(await s.remember('b', 60_000)).toBe(true); // 'b' was evicted
  });
});
