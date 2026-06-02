import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-92 英語ロケール (i18n) acceptance。
 *
 * 既定 ja → UserMenu の言語切替で en にすると、主要ナビ（sidebar）と検索ページの
 * 見出しが英語になることを検証する。locale は localStorage に永続化される。
 * （全文字列の網羅ではなく、切替が効いて主要 UI が英語化する核心を確認）
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('I18n User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('switching locale to en localizes sidebar nav and search', async ({ browser }) => {
  const email = `e2e-i18n-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // UserMenu はサイドバー最下端(mt-auto)にあり、低い viewport では画面外で
  // クリックできない。十分な高さのデスクトップ幅で開く。
  const context = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('I18n WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('I18n WS');

  const sidebar = page.getByTestId('sidebar');
  await expect(sidebar).toBeVisible({ timeout: 10_000 });

  // UserMenu の言語切替で en にすると主要ナビ/検索が英語化することを確認する。
  // （ja↔en 双方向や辞書整合は i18n.test.ts のユニットで保証。E2E は切替が
  //  実 UI に反映される一方向の通しを安定的に検証する。）
  await sidebar.getByTestId('user-menu-button').click();
  await page.getByTestId('locale-en').click();
  await page.keyboard.press('Escape');
  await expect(sidebar).toContainText('Projects');
  await expect(sidebar.getByTestId('sidebar-link-/chat')).toContainText('Chat');

  // 検索ページの見出しも英語
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: /Search/ })).toBeVisible({ timeout: 10_000 });

  // ---- リロードしても en が永続 ---------------------------------------
  await page.reload();
  await expect(page.getByTestId('sidebar')).toContainText('Projects', { timeout: 10_000 });

  await context.close();
});
