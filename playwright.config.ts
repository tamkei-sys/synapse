import { defineConfig, devices } from '@playwright/test';

/**
 * S1 E2E config. Playwright owns the lifecycle of the web + api dev servers
 * so a fresh run always sees a clean toolchain — no manual `pnpm dev` needed.
 *
 * The `dev` container exposes both ports already; Playwright just talks to
 * them at localhost. The Postgres dev container is expected to be running
 * (start with `docker compose -f .devcontainer/docker-compose.yml up -d`).
 */
const PORT_WEB = 5173;
const PORT_API = 8787;
const PORT_SYNC = 1234;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // shared DB state — keep tests serial for S1
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    baseURL: `http://localhost:${PORT_WEB}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      name: 'api',
      command: 'pnpm --filter @synapse/api dev',
      url: `http://localhost:${PORT_API}/healthz`,
      reuseExistingServer: !process.env['CI'],
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      name: 'sync',
      command: 'pnpm --filter @synapse/sync dev',
      // Hocuspocus speaks ws — Playwright waits on a TCP socket via `port:`.
      port: PORT_SYNC,
      reuseExistingServer: !process.env['CI'],
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      name: 'web',
      command: 'pnpm --filter @synapse/web dev',
      url: `http://localhost:${PORT_WEB}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
