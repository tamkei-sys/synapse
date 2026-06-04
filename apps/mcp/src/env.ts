/**
 * Runtime configuration for the MCP server.
 *
 * cc spawns this process and passes credentials via env vars. We
 * intentionally do NOT read from filesystem secrets — that crosses the
 * sandbox boundary CLAUDE.md §6 forbids.
 */
export type McpEnv = {
  databaseUrl: string;
  apiToken: string;
  /**
   * Optional Typesense coordinates. When present, pages created/edited through
   * MCP tools are indexed for search (the API's `indexAfterWrite` no-ops when
   * unset), so MCP-created content stays discoverable. cc may not provide them.
   */
  typesenseUrl?: string;
  typesenseApiKey?: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function loadEnv(): McpEnv {
  return {
    databaseUrl: required('DATABASE_URL'),
    apiToken: required('SYNAPSE_API_TOKEN'),
    typesenseUrl: optional('TYPESENSE_URL'),
    typesenseApiKey: optional('TYPESENSE_API_KEY'),
  };
}
