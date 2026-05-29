/**
 * Better-Auth instance factory.
 *
 * Constructed per request so it can pin to the current Worker's bindings.
 * Email + password は S1 から有効。
 *
 * PBI-18: GitHub OAuth は GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET が
 * 揃ったときだけ enable。dev は GitHub の OAuth App、本番は GitHub App。
 * 未設定なら email/password のみで動く。
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { createDb } from './db.js';
import type { Env } from './env.js';

export type Auth = ReturnType<typeof createAuth>;

export function isGithubOauthEnabled(env: Env): boolean {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

export function createAuth(env: Env) {
  const db = createDb(env.DATABASE_URL);

  const socialProviders = isGithubOauthEnabled(env)
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID as string,
          clientSecret: env.GITHUB_CLIENT_SECRET as string,
        },
      }
    : undefined;

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
    ...(socialProviders ? { socialProviders } : {}),
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh once per day
    },
  });
}
