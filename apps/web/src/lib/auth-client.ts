/**
 * Better-Auth client bound to the API host. Imported by route components and
 * by the auth store. All session reads/writes go through this — never
 * `fetch('/api/auth/...')` directly.
 */
import { createAuthClient } from 'better-auth/react';

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

// Inferred return type leaks better-auth's internal path-to-object module,
// which trips TS2742 under `composite: true`. ReturnType<typeof> sidesteps it
// by giving the export a nameable identifier.
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: `${apiBase}/api/auth`,
});

export const { signIn, signUp, signOut, useSession } = authClient;
