import { expect, test, type Page } from '@playwright/test';

/**
 * Re-parenting acceptance (this change): an existing PBI can be assigned to a
 * project after creation, and an existing SBI can be moved under a different
 * PBI — both from the `/b/$blockId` detail view via the inline parent select.
 *
 * The SBI move is the load-bearing case: it proves the `parentId` column
 * travels with the `props.pbiId` mirror, because `listForPbi` reads the
 * column — the new parent picks the SBI up and the old one drops it.
 */

// Pin the locale so the Japanese auth screen + labels are deterministic in CI
// (the runner's Chromium defaults to en-US otherwise).
test.use({ locale: 'ja-JP' });

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUpInWorkspace(page: Page, wsName: string) {
  const email = `e2e-rp-${unique()}@synapse.test`;
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Reparent User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill('correct horse battery staple');
  await page.getByRole('button', { name: /アカウント作成/i }).click();

  await page.getByTestId('workspace-name-input').fill(wsName);
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText(wsName);
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

/**
 * Create a fresh page and drop one PBI into it via `/pbi`. Each call gets
 * its own page so the `pbi-ref-` ref node is unambiguous — multiple PBIs in
 * one editor race on hydration order and the second id is sometimes still
 * empty when we read it.
 */
async function newPbi(page: Page): Promise<string> {
  // The slash-menu DOM gets replaced between pages, so a `.click()` on
  // the menu item races with the re-render ("element detached"). Two
  // guards: wait for the URL to actually change to a *different* /p/ id,
  // and confirm the slash selection with Enter (the pbi item is
  // aria-selected by default — keyboard confirm sidesteps the race).
  const prevUrl = page.url();
  await page.getByTestId('sidebar-new-page').click();
  await page.waitForURL((url) => /\/p\/[0-9A-Z]+$/.test(url.pathname) && url.href !== prevUrl, {
    timeout: 10_000,
  });
  await waitForLive(page);
  const editor = page.getByTestId('editor-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await editor.pressSequentially('/pbi');
  await expect(page.getByTestId('slash-menu')).toBeVisible();
  await expect(page.getByTestId('slash-item-pbi')).toHaveAttribute('aria-selected', 'true');
  await editor.press('Enter');
  const ref = page.locator('[data-testid^="pbi-ref-"]').first();
  await expect(ref).toBeVisible({ timeout: 10_000 });
  const id = (await ref.getAttribute('data-pbi-id')) ?? '';
  expect(id).not.toEqual('');
  return id;
}

test('a PBI can be assigned to a project after creation', async ({ page }) => {
  await signUpInWorkspace(page, 'Reparent PBI WS');

  // A project to assign the PBI to.
  await page.goto('/project');
  await page.getByTestId('new-project-name').fill('Alpha');
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('project-list')).toContainText('Alpha');

  // A PBI, created with no project (the s4 slash-command flow).
  const pbiId = await newPbi(page);

  // Assign it to Alpha from the detail view.
  await page.goto(`/b/${pbiId}`);
  const select = page.getByTestId('pbi-project-select');
  await expect(select).toBeVisible();
  await expect(select).toHaveValue(''); // starts unassigned
  const alphaId = (await select.locator('option', { hasText: 'Alpha' }).getAttribute('value')) ?? '';
  expect(alphaId).not.toEqual('');
  await select.selectOption(alphaId);

  // The assignment survives a reload…
  await page.reload();
  await expect(page.getByTestId('pbi-project-select')).toHaveValue(alphaId);

  // …and the PBI now appears under the project's children.
  await page.goto(`/b/${alphaId}`);
  await expect(page.getByTestId(`child-row-${pbiId}`)).toBeVisible();
});

test('an SBI can be re-parented to a different PBI', async ({ page }) => {
  await signUpInWorkspace(page, 'Reparent SBI WS');

  // Two PBIs, one per page (the slash command's hydration races when more
  // than one ref node lives in a single editor — see newPbi for the why).
  const pbiA = await newPbi(page);
  const pbiB = await newPbi(page);
  expect(pbiA).not.toEqual(pbiB);

  // Add an SBI under PBI-A, then open it.
  await page.goto(`/b/${pbiA}`);
  await page.getByTestId('new-sbi-title').fill('Movable task');
  await page.getByTestId('create-sbi-submit').click();
  const sbiLink = page.getByTestId('child-sbi-list').locator('a').first();
  await expect(sbiLink).toBeVisible({ timeout: 10_000 });
  await sbiLink.click();
  await expect(page).toHaveURL(/\/b\/[0-9A-Z]+$/);
  const sbiId = page.url().split('/b/')[1] ?? '';
  expect(sbiId).not.toEqual('');

  // Re-parent it onto PBI-B from the SBI detail view.
  const pbiSelect = page.getByTestId('sbi-pbi-select');
  await expect(pbiSelect).toBeVisible();
  await expect(pbiSelect).toHaveValue(pbiA); // currently under PBI-A
  await pbiSelect.selectOption(pbiB);

  // Persists across a reload.
  await page.reload();
  await expect(page.getByTestId('sbi-pbi-select')).toHaveValue(pbiB);

  // PBI-B now lists the SBI as a child; PBI-A no longer does — the parentId
  // column moved, not just the props mirror.
  await page.goto(`/b/${pbiB}`);
  await expect(page.getByTestId(`child-row-${sbiId}`)).toBeVisible();
  await page.goto(`/b/${pbiA}`);
  await expect(page.getByTestId(`child-row-${sbiId}`)).toHaveCount(0);
});
