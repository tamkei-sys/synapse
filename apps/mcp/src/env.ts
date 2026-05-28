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
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function loadEnv(): McpEnv {
  return {
    databaseUrl: required('DATABASE_URL'),
    apiToken: required('SYNAPSE_API_TOKEN'),
  };
}
