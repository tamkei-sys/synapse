/**
 * GitHub webhook handler.
 *
 * Sequence (CLAUDE.md §6):
 *   1. Pull the raw body (signature is over the bytes, not parsed JSON).
 *   2. Verify HMAC-SHA256 against `GITHUB_WEBHOOK_SECRET`.
 *   3. Dedup by `X-GitHub-Delivery` against an idempotency store.
 *   4. Dispatch by `X-GitHub-Event` to a typed inbound handler.
 *
 * Steps 2 + 3 must run before any DB write. Step 4 should complete fast
 * enough to stay inside the 100ms budget; once we have Cloudflare
 * Queues we'll fan out instead.
 */
import { Hono } from 'hono';

import type { AppBindings } from '../../env.js';
import { createDb } from '../../db.js';
import { applyIssuesEvent, type IssuesEventPayload } from './inbound.js';
import { getDevIdempotencyStore, type IdempotencyStore } from './idempotency.js';
import { verifyGithubSignature } from './verify.js';

const DELIVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24h per CLAUDE.md §6

export function createGithubWebhookRouter(options: { idempotency?: IdempotencyStore } = {}) {
  const app = new Hono<AppBindings>();
  const idem = options.idempotency ?? getDevIdempotencyStore();

  app.post('/webhook', async (c) => {
    const secret = c.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return c.json({ ok: false, error: 'webhook not configured' }, 503);
    }

    const body = await c.req.text();
    const sig = c.req.header('x-hub-signature-256');
    const verified = await verifyGithubSignature(secret, body, sig ?? null);
    if (!verified.ok) {
      return c.json({ ok: false, error: verified.reason }, 401);
    }

    const delivery = c.req.header('x-github-delivery');
    if (!delivery) {
      return c.json({ ok: false, error: 'missing X-GitHub-Delivery' }, 400);
    }
    const fresh = await idem.remember(delivery, DELIVERY_TTL_MS);
    if (!fresh) {
      // Replay — accept silently so GitHub stops retrying.
      return c.json({ ok: true, deduped: true });
    }

    const event = c.req.header('x-github-event');
    if (!event) return c.json({ ok: false, error: 'missing X-GitHub-Event' }, 400);

    if (event === 'ping') {
      return c.json({ ok: true, pong: true });
    }

    if (event !== 'issues') {
      // Quietly accept events we don't handle yet; GitHub treats 2xx as
      // "no need to retry".
      return c.json({ ok: true, ignored: event });
    }

    let payload: IssuesEventPayload;
    try {
      payload = JSON.parse(body) as IssuesEventPayload;
    } catch {
      return c.json({ ok: false, error: 'invalid JSON' }, 400);
    }

    const db = createDb(c.env.DATABASE_URL);
    const result = await applyIssuesEvent(db, payload);
    return c.json(result);
  });

  return app;
}
