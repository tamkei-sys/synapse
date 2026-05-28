/**
 * Better-Auth instance factory.
 *
 * Constructed per request so it can pin to the current Worker's bindings.
 * Email + password is enabled for S1; OAuth providers will be added in
 * follow-up sprints.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { createDb } from './db.js';
import type { Env } from './env.js';

export type Auth = ReturnType<typeof createAuth>;

export function createAuth(env: Env) {
  const db = createDb(env.DATABASE_URL);

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
    database: drizzleAdapter(db, {
      provider: 'pg',
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh once per day
    },
  });
}
