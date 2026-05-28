/**
 * tRPC v11 context, router, and procedure builders.
 *
 * Each request constructs a context that carries the request-scoped db
 * client and the resolved Better-Auth session (if any). Auth is enforced by
 * the `protectedProcedure` builder — never by hand.
 */
import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';

import { createAuth, type Auth } from './auth.js';
import { createDb, type Database } from './db.js';
import type { Env } from './env.js';

/**
 * Register a promise to be awaited *after* the HTTP response is sent.
 *
 * In Cloudflare Workers (workerd) the isolate is allowed to die as soon as
 * the response stream is closed, which silently cancels any orphan promises
 * left in flight. Routines like the cc sandbox stub or Typesense indexing
 * need to keep running past that boundary — `ctx.waitUntil(p)` re-parents
 * them onto the request's `ExecutionContext` so workerd holds the isolate
 * open until they settle.
 *
 * Node (vitest) doesn't kill orphan promises, so the fallback in
 * `createTrpcContext` is a plain `void p`.
 */
export type WaitUntil = (p: Promise<unknown>) => void;

export type TrpcContext = {
  db: Database;
  auth: Auth;
  /** Cloudflare bindings — secrets, etc. Feature code reads via `ctx.env`. */
  env: Env;
  session: Awaited<ReturnType<Auth['api']['getSession']>>;
  headers: Headers;
  /** Post-response async hook — see `WaitUntil`. */
  waitUntil: WaitUntil;
};

export async function createTrpcContext(
  env: Env,
  opts: FetchCreateContextFnOptions,
  waitUntil: WaitUntil = (p) => {
    // Node fallback — orphans survive on their own.
    void p;
  },
): Promise<TrpcContext> {
  const db = createDb(env.DATABASE_URL);
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: opts.req.headers });
  return { db, auth, env, session, headers: opts.req.headers, waitUntil };
}

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
