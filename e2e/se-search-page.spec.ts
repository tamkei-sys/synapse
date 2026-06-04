import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-80 全文検索ページ acceptance。
 *
 * /search が開き、検索ボックス・type フィルタ・空状態が表示されることを検証する。
 * 実際の hit は Typesense（dev では unhealthy なこともある）依存のため、ここでは
 * UI 骨格と未入力/未ヒット時の表示を確認する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Search User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('search page shows box, filters, and empty states', async ({ browser }) => {
  const email = `e2e-se-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // ロケールを ja に固定する。空状態の案内文は i18n 文字列（page.search.prompt）で、
  // 既定ロケールは localStorage 未設定時 navigator.language にフォールバックする
  // (ui-store.loadLocale)。CI の Chromium は en-US なので固定しないと英語になり、
  // 日本語アサーションが落ちる。
  const context = await browser.newContext({ locale: 'ja-JP' });
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Search WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Search WS');

  // ---- /search を開く --------------------------------------------------
  await page.goto('/search');
  await expect(page.getByTestId('search-input')).toBeVisible({ timeout: 10_000 });

  // 未入力時は案内文
  await expect(page.getByTestId('search-results')).toContainText('キーワードを入力');

  // type フィルタが並ぶ
  await expect(page.getByTestId('search-filter-all')).toBeVisible();
  await expect(page.getByTestId('search-filter-page')).toBeVisible();
  await expect(page.getByTestId('search-filter-pbi')).toBeVisible();

  // ---- まずヒットしないキーワードで空状態を確認 ------------------------
  await page.getByTestId('search-input').fill(`zzz-no-match-${unique()}`);
  await expect(page.getByTestId('search-empty')).toBeVisible({ timeout: 10_000 });

  await context.close();
});
