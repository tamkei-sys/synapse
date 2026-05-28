/**
 * Local stub for the headless-cc sandbox.
 *
 * Production wiring runs cc inside a Cloudflare Container with the
 * SYNAPSE MCP server attached, ending in a GitHub PR. For S9 we don't
 * have that runtime locally, so this module simulates the lifecycle:
 *
 *   queued → running (after 200ms) → succeeded (after 600ms total)
 *
 * with a synthetic PR URL. The fake transition is enough to exercise
 * every UI state and every audit-log row the production path will
 * write. Real cc invocation lands when `apps/sandbox` is built (S9+).
 */
import { eq } from 'drizzle-orm';

import { db as schema } from '@synapse/schema';

import type { Database } from '../../db.js';

export function startStubSession(db: Database, sessionId: string): void {
  // Fire-and-forget. The tRPC response has already returned.
  void (async () => {
    try {
      await sleep(200);
      await db
        .update(schema.ccSession)
        .set({
          status: 'running',
          lastMessage: 'sandbox: cc started',
          updatedAt: new Date(),
        })
        .where(eq(schema.ccSession.id, sessionId));

      await sleep(400);
      const fakePrUrl = `https://github.com/example/synapse-sandbox/pull/${randomNumber()}`;
      await db
        .update(schema.ccSession)
        .set({
          status: 'succeeded',
          lastMessage: 'sandbox: PR opened (stub)',
          prUrl: fakePrUrl,
          updatedAt: new Date(),
        })
        .where(eq(schema.ccSession.id, sessionId));
    } catch (err) {
      console.warn('[cc/stub] background failure:', err);
      await db
        .update(schema.ccSession)
        .set({
          status: 'failed',
          lastMessage: 'sandbox: stub error',
          updatedAt: new Date(),
        })
        .where(eq(schema.ccSession.id, sessionId))
        .catch(() => undefined);
    }
  })();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomNumber(): number {
  return Math.floor(Math.random() * 9000) + 1000;
}
