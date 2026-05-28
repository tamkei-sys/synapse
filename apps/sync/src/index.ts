/**
 * SYNAPSE realtime sync entrypoint.
 *
 * Long-running Node process. Hocuspocus mounts at the websocket root and
 * gates every connection through `onAuthenticate` before persistence
 * touches the DB.
 */
import { Server, type onAuthenticatePayload } from '@hocuspocus/server';

import { authenticateConnection } from './auth.js';
import { createDb } from './db.js';
import { loadEnv } from './env.js';
import { createPersistenceExtension } from './persistence.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const db = createDb(env.databaseUrl);

  // Hocuspocus's `Server` is a singleton factory, not a constructor:
  // configure() returns the running instance.
  const server = Server.configure({
    port: env.port,
    name: 'synapse-sync',
    extensions: [createPersistenceExtension(db)],

    async onAuthenticate({ token, documentName }: onAuthenticatePayload) {
      if (!token) throw new Error('Missing auth token');
      // Return value lands on `connection.context` for later hooks.
      return authenticateConnection(db, token, documentName);
    },
  });

  await server.listen();
  console.info(`[synapse-sync] listening on :${env.port}`);
}

main().catch((err) => {
  console.error('[synapse-sync] fatal:', err);
  process.exit(1);
});
