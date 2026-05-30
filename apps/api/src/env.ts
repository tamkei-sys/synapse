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

  // ---- Search (S8) -------------------------------------------------------
  /** Typesense base URL (e.g. http://typesense:8108). */
  TYPESENSE_URL?: string;
  /** Typesense API key — workspace-isolated scoping comes via search keys S8+. */
  TYPESENSE_API_KEY?: string;

  // ---- AI (S8) -----------------------------------------------------------
  /** Anthropic API key for the `=ASK()` formula and other AI surfaces. */
  ANTHROPIC_API_KEY?: string;

  // ---- GitHub OAuth (PBI-18) ---------------------------------------------
  /**
   * GitHub OAuth App の client_id / secret。
   * 両方揃ったときだけ Better-Auth で github provider が enable される。
   * 開発用は https://github.com/settings/developers から取得。
   * 本番は GitHub App + Cloudflare Secrets。
   */
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  // ---- cc Container (PBI-19) --------------------------------------------
  /**
   * Cloudflare Container DO binding for the cc-container image.
   * Set in wrangler.toml as `containers.binding = CC_CONTAINER`.
   * Local dev は undefined のままで OK（stub にフォールバック）。
   */
  CC_CONTAINER?: {
    idFromName(name: string): { fetch: (req: Request) => Promise<Response> };
  };
  /**
   * SYNAPSE が cc コンテナに渡す callback トークンの署名鍵。
   * 短期トークン (≤ 30 min) を発行するための HS256 secret。
   */
  CC_SESSION_TOKEN_SECRET?: string;
  /**
   * cc コンテナが SYNAPSE API を叩く外向き URL（自分自身）。
   * 通常は env.WEB_ORIGIN ではなく BETTER_AUTH_URL と一致する API ホスト。
   */
  CC_API_BASE?: string;
};

export type AppBindings = {
  Bindings: Env;
};
