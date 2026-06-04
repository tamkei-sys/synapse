import { expect, test, type Page } from '@playwright/test';

/**
 * S8 acceptance test: Cmd+K full-text search finds a freshly-created
 * PBI, and a spreadsheet cell containing `=ASK("...")` resolves via
 * the AI ask path.
 *
 * The AI call falls back to a deterministic stub in dev (no
 * ANTHROPIC_API_KEY), so we assert the stub shape (`[stub: ...]`).
 *
 * Covers Sprint 8 DoD: "Cmd+K full-text; AI formula works."
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function setCell(page: Page, ref: string, value: string) {
  const m = /^([A-Z])(\d+)$/.exec(ref);
  if (!m || !m[1] || !m[2]) throw new Error(`bad ref ${ref}`);
  const col = m[1];
  const rowIndex = Number(m[2]) - 1;
  const cell = page.locator(`.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${col}"]`);
  await cell.click();
  const input = cell.locator('input').first();
  await input.fill(value);
  await page.keyboard.press('Enter');
}

test('Cmd+K finds a PBI; =ASK formula renders the stub answer', async ({ page }) => {
  const email = `e2e-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // -- onboarding ----------------------------------------------------------
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('S8 User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();

  await page.getByTestId('workspace-name-input').fill('Acme');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Acme');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });

  // -- create a PBI ('無題 PBI' is enough — the query is scoped to a
  //    workspace that only this fresh user owns) -------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/pbi');
  await page.getByTestId('slash-item-pbi').click();

  const pbiRef = page.locator('[data-testid^="pbi-ref-"]').first();
  await expect(pbiRef).toBeVisible({ timeout: 10_000 });
  const pbiId = (await pbiRef.getAttribute('data-pbi-id')) ?? '';
  expect(pbiId).not.toEqual('');

  // Indexing is fire-and-forget; give Typesense a moment.
  await page.waitForTimeout(1500);

  // -- Cmd+K → finds the PBI by its auto-generated title -----------------
  await page.keyboard.press('ControlOrMeta+k');
  const palette = page.getByTestId('command-palette');
  await expect(palette).toBeVisible();
  await page.getByTestId('command-palette-input').fill('無題');
  await expect(page.getByTestId(`command-hit-${pbiId}`)).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape');

  // -- /sheet → =ASK("hello") → stub answer renders -----------------------
  await page.goto('/');
  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });

  const editor2 = page.getByTestId('editor-content');
  await editor2.click();
  await editor2.pressSequentially('/sheet');
  await page.getByTestId('slash-item-sheet').click();
  await expect(page.locator('[data-testid^="sheet-embed-"]').first()).toBeVisible({
    timeout: 10_000,
  });

  await setCell(page, 'A1', '=ASK("hello synapse")');

  // The stub returns `[stub: <prompt-prefix>]` — appears within a tick or
  // two after the mutation resolves.
  const a1 = page.locator(`.ag-row[row-index="0"] .ag-cell[col-id="A"]`).first();
  await expect(a1).toContainText('[stub:', { timeout: 5_000 });
  await expect(a1).toContainText('hello synapse');
});
