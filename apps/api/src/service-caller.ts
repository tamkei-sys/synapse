/**
 * In-process tRPC caller for trusted server-side actors — currently the
 * SYNAPSE MCP server, which authenticates via a workspace-scoped API token
 * rather than a Better-Auth browser session.
 *
 * `protectedProcedure` (see trpc.ts) only requires `ctx.session` to be
 * present; procedures then read `ctx.session.user.id` as the acting user and
 * enforce workspace authorization through `assertWorkspaceMember` /
 * `assertCanWrite`. We synthesize the minimal session carrying the actor's
 * user id. The caller's owner (the MCP layer) is responsible for resolving the
 * token to a real `(workspaceId, userId)` and for its own scope checks before
 * invoking any procedure.
 */
import { appRouter } from './routers/index.js';
import type { Auth } from './auth.js';
import type { Database } from './db.js';
import type { Env } from './env.js';
import type { TrpcContext } from './trpc.js';

export type ServiceCaller = ReturnType<typeof appRouter.createCaller>;

export type ServiceCallerOptions = {
  db: Database;
  env: Env;
  /** The acting user's id, resolved upstream from an API token. */
  actorUserId: string;
};

/**
 * Better-Auth is never exercised by service-actor procedure calls (those go
 * through the HTTP `/api/auth` routes, not tRPC). Guard against accidental use
 * by throwing on any access instead of silently returning undefined.
 */
const serviceAuth = new Proxy(
  {},
  {
    get() {
      throw new Error('Better-Auth is unavailable in the service caller context');
    },
  },
) as Auth;

export function createServiceCaller(opts: ServiceCallerOptions): ServiceCaller {
  // Procedures only read `ctx.session.user.id`; build that minimal shape and
  // trust the upstream token resolution for the rest. The cast is required
  // because a full Better-Auth session cannot be forged here — and isn't
  // needed for the procedures a service actor invokes.
  const session = {
    user: { id: opts.actorUserId },
  } as unknown as TrpcContext['session'];

  const ctx: TrpcContext = {
    db: opts.db,
    auth: serviceAuth,
    env: opts.env,
    session,
    headers: new Headers(),
    waitUntil: (p) => {
      void p;
    },
  };

  return appRouter.createCaller(ctx);
}
