/**
 * tRPC v11 client bound to the API host.
 *
 * Uses `superjson` (matches the server transformer) and credentials so
 * Better-Auth session cookies are sent on every call.
 */
import { createTRPCClient, httpBatchLink, type CreateTRPCClient } from '@trpc/client';
import superjson from 'superjson';

import type { AppRouter } from '@synapse/api';

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

// Explicit annotation keeps the emitted .d.ts portable; the inferred return
// type from `createTRPCClient` otherwise leaks `@synapse/api`'s internal
// dist/trpc.d.ts path (TS2742 under composite projects).
export const trpc: CreateTRPCClient<AppRouter> = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiBase}/trpc`,
      transformer: superjson,
      fetch(input, init) {
        return fetch(input, { ...init, credentials: 'include' });
      },
    }),
  ],
});
