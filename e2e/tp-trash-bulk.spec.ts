import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-90 ゴミ箱のバルク復元 acceptance。
 *
 * ページを作成 → ゴミ箱へ移動 → /trash でチェック選択 → 「選択を復元」で
 * 一括復元され、ゴミ箱が空になることを検証する。自動パージ（cron/30日）は
 * purge-trash の lib + scheduled で別途実装（時間依存のため E2E 対象外）。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Trash User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('bulk-select trashed pages and restore them', async ({ browser }) => {
  const email = `e2e-tp-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Trash WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Trash WS');

  // ---- ページを作成して削除（ゴミ箱へ） -------------------------------
  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  const pageId = page.url().match(/\/p\/([0-9A-Z]+)/)?.[1] ?? '';
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('page-delete').click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

  // ---- /trash でゴミ箱に出る ------------------------------------------
  await page.goto('/trash');
  await expect(page.getByTestId(`trash-item-${pageId}`)).toBeVisible({ timeout: 10_000 });

  // ---- チェック選択 → バルクバー → 選択を復元 -------------------------
  await page.getByTestId(`trash-select-${pageId}`).check();
  await expect(page.getByTestId('trash-bulk-bar')).toBeVisible();
  await expect(page.getByTestId('trash-selected-count')).toContainText('1');
  await page.getByTestId('trash-bulk-restore').click();

  // ---- ゴミ箱が空になる ------------------------------------------------
  await expect(page.getByTestId('trash-empty')).toBeVisible({ timeout: 10_000 });

  await context.close();
});
