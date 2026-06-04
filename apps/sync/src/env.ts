/**
 * Runtime configuration for the Hocuspocus container.
 *
 * Reads from `process.env`; the dev-container compose file already
 * injects DATABASE_URL. Production deployment will set the same vars
 * via the container orchestrator.
 */
export type SyncEnv = {
  port: number;
  databaseUrl: string;
  /** Internal doc-write API port (server-to-server; never public). (ADR-0011) */
  internalPort: number;
  /**
   * Shared secret gating the internal doc-write API. When unset, the API is
   * not started — so existing deployments stay ws-only until configured.
   */
  internalSecret?: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function loadEnv(): SyncEnv {
  return {
    port: Number(process.env['SYNC_PORT'] ?? 1234),
    databaseUrl: required('DATABASE_URL'),
    internalPort: Number(process.env['SYNC_INTERNAL_PORT'] ?? 1235),
    internalSecret: process.env['SYNC_INTERNAL_SECRET'] || undefined,
  };
}
