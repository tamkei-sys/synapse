import { expect, test, type Page } from '@playwright/test';

/**
 * ADR-0011 acceptance: writing a page body through the sync server's internal
 * doc-write endpoint (what synapse_append_doc does over MCP) reflects into a
 * *live* editor in real time — proving the openDirectConnection path broadcasts
 * to connected clients and persists, not just a detached write.
 *
 * The endpoint is internal + secret-gated; in CI the e2e job sets
 * SYNC_INTERNAL_SECRET so apps/sync starts it on :1235.
 */
const INTERNAL_URL = process.env['SYNC_INTERNAL_URL'] ?? 'http://localhost:1235';
const INTERNAL_SECRET = process.env['SYNC_INTERNAL_SECRET'] ?? 'dev-internal-secret';

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Doc Append User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('append_doc endpoint reflects markdown into a live editor', async ({ page }) => {
  const email = `e2e-da-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Doc Append WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Doc Append WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);
  await expect(page.getByTestId('editor-content')).toBeVisible();

  const pageId = page.url().split('/p/')[1] ?? '';
  expect(pageId).not.toEqual('');
  const marker = `Appended-${unique()}`;

  // Simulate synapse_append_doc: a trusted internal write through the sync
  // server (no actorUserId → system write, gated by the shared secret).
  const res = await fetch(`${INTERNAL_URL}/internal/doc/write`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
    body: JSON.stringify({ blockId: pageId, mode: 'append', markdown: `## ${marker}\n\nappended body text` }),
  });
  expect(res.status).toBe(200);

  // openDirectConnection broadcasts to this already-open editor — the heading
  // and paragraph show up without a reload.
  const editor = page.getByTestId('editor-content');
  await expect(editor).toContainText(marker, { timeout: 15_000 });
  await expect(editor).toContainText('appended body text');

  // And it survives a reload (persisted, not just in-memory).
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('editor-content')).toContainText(marker, { timeout: 10_000 });
});

/**
 * ADR-0011 amendment (2026-06-11): the same endpoint also writes the document
 * body of PM items — here a PBI, whose `/b/$blockId` detail view edits the
 * `block:<id>` Yjs document — through the identical live-broadcast path.
 */
test('append_doc endpoint writes a PBI document body into a live /b/ editor', async ({
  page,
}) => {
  const email = `e2e-dab-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('PBI Doc WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('PBI Doc WS');

  // Create a PBI through the `/pbi` slash command (the s4 flow), then open
  // its detail view, which mounts the PageEditor on the block's own doc.
  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/pbi');
  await expect(page.getByTestId('slash-menu')).toBeVisible();
  await page.getByTestId('slash-item-pbi').click();

  const pbiRef = page.locator('[data-testid^="pbi-ref-"]').first();
  await expect(pbiRef).toBeVisible({ timeout: 10_000 });
  const pbiId = (await pbiRef.getAttribute('data-pbi-id')) ?? '';
  expect(pbiId).not.toEqual('');

  await page.goto(`/b/${pbiId}`);
  await waitForLive(page);
  await expect(page.getByTestId('editor-content')).toBeVisible();

  const marker = `PbiBody-${unique()}`;
  const res = await fetch(`${INTERNAL_URL}/internal/doc/write`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
    body: JSON.stringify({
      blockId: pbiId,
      mode: 'append',
      markdown: `### ${marker}\n\nPBI body written through the doc-write path`,
    }),
  });
  expect(res.status).toBe(200);

  const pbiEditor = page.getByTestId('editor-content');
  await expect(pbiEditor).toContainText(marker, { timeout: 15_000 });
  await expect(pbiEditor).toContainText('PBI body written through the doc-write path');

  // Persisted, not just broadcast to the open tab.
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('editor-content')).toContainText(marker, { timeout: 10_000 });
});
