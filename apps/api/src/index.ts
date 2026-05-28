// SYNAPSE API entry — scaffolded in S1.
// Hono + tRPC v11 wiring lands in S1 follow-ups.

import { Hono } from 'hono';

// Cloudflare bindings will be declared on Env as they are added.
// Example: type Env = { DB: D1Database; KV: KVNamespace }.
type Env = Record<string, never>;

const app = new Hono<{ Bindings: Env }>();

app.get('/healthz', (c) => c.json({ ok: true, service: 'synapse-api' }));

export default app;
