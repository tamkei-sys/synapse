import { expect, test, type Page } from '@playwright/test';

/**
 * 使い方マニュアル (/help) acceptance (PBI-93)。
 *
 * 新規ワークスペースでも、サイドバーの「📖 使い方」から操作マニュアルを開ける
 * ことを検証する。Yjs/DB に依存しない静的ページ。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Help User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('new workspace can open the how-to manual from the sidebar', async ({ browser }) => {
  const email = `e2e-help-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Help WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Help WS');

  // ---- サイドバーの「使い方」リンクから /help へ（ロケール非依存に href で） --
  await page.locator('a[href="/help"]').first().click();
  await expect(page).toHaveURL(/\/help$/);

  // ---- マニュアルの主要セクションが見える ------------------------------
  await expect(page.getByRole('heading', { name: /SYNAPSE の使い方/ })).toBeVisible();
  await expect(page.getByTestId('help-sections')).toContainText('ページとドキュメント');
  await expect(page.getByTestId('help-sections')).toContainText('PBI');
  await expect(page.getByTestId('help-sections')).toContainText('検索');
  await expect(page.getByTestId('help-sections')).toContainText('MCP');

  await context.close();
});
