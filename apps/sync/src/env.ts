/**
 * Runtime configuration for the Hocuspocus container.
 *
 * Reads from `process.env`; the dev-container compose file already
 * injects DATABASE_URL. Production deployment will set the same vars
 * via the container orchestrator.
 */
export type SyncEnv = {
  port: number;
  /**
   * Bind address. Default `0.0.0.0` keeps the devcontainer port-forward
   * working; the VPS deployment sets `127.0.0.1` and fronts the websocket
   * with nginx instead (ADR-0013).
   */
  host: string;
  databaseUrl: string;
  /** Internal doc-write API port (server-to-server; never public). (ADR-0011) */
  internalPort: number;
  /**
   * Internal doc-write API bind address. Unset → 0.0.0.0 (the devcontainer
   * port-map needs it); the VPS sets 127.0.0.1 so the API stays loopback-only
   * per ADR-0011.
   */
  internalHost?: string;
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
    host: process.env['SYNC_HOST'] ?? '0.0.0.0',
    databaseUrl: required('DATABASE_URL'),
    internalPort: Number(process.env['SYNC_INTERNAL_PORT'] ?? 1235),
    internalHost: process.env['SYNC_INTERNAL_HOST'] || undefined,
    internalSecret: process.env['SYNC_INTERNAL_SECRET'] || undefined,
  };
}
