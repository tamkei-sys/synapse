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
};

export type AppBindings = {
  Bindings: Env;
};
