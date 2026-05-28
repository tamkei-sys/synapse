/**
 * Strongly-typed Cloudflare Workers environment bindings.
 *
 * Per CLAUDE.md §6: secrets are accessed via `c.env.<NAME>` — never
 * `process.env`. New bindings declared here also need to be registered in
 * `wrangler.toml` (vars) or via `wrangler secret put` (secrets).
 */
export type Env = {
  /** Postgres connection string (Neon HTTP-compatible URL recommended). */
  DATABASE_URL: string;
  /** Public URL of the API (used by Better-Auth for callback resolution). */
  BETTER_AUTH_URL: string;
  /** Server-side secret used to sign Better-Auth tokens. */
  BETTER_AUTH_SECRET: string;
  /** Origin of the web client; used for CORS allow-list. */
  WEB_ORIGIN: string;

  // ---- GitHub integration (S5) -------------------------------------------
  /** Webhook signing secret configured on the GitHub App. */
  GITHUB_WEBHOOK_SECRET?: string;
  /**
   * Personal access token or installation token used for outbound pushes
   * in dev. Production switches to a proper GitHub App installation token
   * (S5 follow-up). Outbound is a no-op when this is unset.
   */
  GITHUB_TOKEN?: string;
  /** Base URL of the GitHub REST API. Override in tests to point at a mock. */
  GITHUB_API_BASE?: string;
};

export type AppBindings = {
  Bindings: Env;
};
