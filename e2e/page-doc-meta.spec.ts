import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-107 ドキュメント・ライフサイクル acceptance。
 *
 * ページ詳細の「📑」パネルからステータスを設定すると、updatePageMeta 経由で
 * page.props に保存され、ボタンのバッジが即時に反映される。
 */
const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('DocMeta User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill('correct horse battery staple');
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('document metadata panel sets status and the badge reflects it', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, `e2e-docmeta-${unique()}@synapse.test`);
  await page.getByTestId('workspace-name-input').fill('DocMeta WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('DocMeta WS');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);

  // 📑 パネルを開いてステータスを「レビュー待ち」に。
  await page.getByTestId('page-doc-meta-button').click();
  await expect(page.getByTestId('doc-meta-panel')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('doc-status-select').selectOption('in_review');

  // 種別も設定。
  await page.getByTestId('doc-type-select').selectOption('plan');

  // ボタンのバッジがステータスを反映する（updatePageMeta → getPage 再取得）。
  await expect(page.getByTestId('page-doc-status-badge')).toHaveText('レビュー待ち', {
    timeout: 10_000,
  });

  // リロードしても永続。
  await page.reload();
  await expect(page.getByTestId('page-doc-status-badge')).toHaveText('レビュー待ち', {
    timeout: 10_000,
  });

  await context.close();
});
