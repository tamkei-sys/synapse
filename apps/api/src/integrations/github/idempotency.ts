/**
 * Webhook idempotency.
 *
 * GitHub retries on 5xx and on timeout; replays use the same
 * `X-GitHub-Delivery` id. CLAUDE.md §6 wants the id checked against a
 * dedup KV with a 24h TTL so duplicate retries become no-ops.
 *
 * In a Cloudflare Workers deployment this maps to a KV binding; here we
 * accept any KV-shaped object so tests can swap an in-memory dummy. A
 * minimal in-process LRU is provided for dev convenience.
 */

export type IdempotencyStore = {
  /** Returns true if the id is newly recorded; false if it already exists. */
  remember(id: string, ttlMs: number): Promise<boolean>;
};

/** Heap-backed dev fallback. Never use in prod. */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly seen = new Map<string, number>();
  private readonly capacity: number;

  constructor(capacity = 1_000) {
    this.capacity = capacity;
  }

  async remember(id: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = this.seen.get(id);
    if (typeof expiresAt === 'number' && expiresAt > now) return false;
    if (this.seen.size >= this.capacity) {
      // Evict the oldest entry (Map iteration order is insertion order).
      const oldest = this.seen.keys().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    this.seen.set(id, now + ttlMs);
    return true;
  }
}

/** Process-wide singleton — the dev API worker reuses it across requests. */
let _dev: InMemoryIdempotencyStore | null = null;
export function getDevIdempotencyStore(): IdempotencyStore {
  if (!_dev) _dev = new InMemoryIdempotencyStore();
  return _dev;
}
