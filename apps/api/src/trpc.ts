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

export type TrpcContext = {
  db: Database;
  auth: Auth;
  /** Cloudflare bindings — secrets, etc. Feature code reads via `ctx.env`. */
  env: Env;
  session: Awaited<ReturnType<Auth['api']['getSession']>>;
  headers: Headers;
};

export async function createTrpcContext(
  env: Env,
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const db = createDb(env.DATABASE_URL);
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: opts.req.headers });
  return { db, auth, env, session, headers: opts.req.headers };
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
