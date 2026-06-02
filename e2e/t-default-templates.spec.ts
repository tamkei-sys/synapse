import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-105 組み込みデフォルトテンプレート acceptance。
 *
 * 新規ワークスペースを作ると、workspace.create が汎用テンプレ集を seed する。
 * サイドバーの「📋」を開くと組み込みテンプレが並び、選ぶと本文付きの新ページ
 * が開く。本文は sync サーバが props.doc から Yjs を seed して復元する
 * （apps/sync template-schema）。本文が出れば次がすべて通った証拠になる:
 *   ① workspace.create が props.doc 付きテンプレを seed し
 *   ② createFromTemplate が新ページへ props.doc を引き継ぎ
 *   ③ sync の fetch が props.doc から Yjs state を seed して配信した
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Default Tpl User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('a new workspace ships built-in templates whose body hydrates from the snapshot', async ({
  browser,
}) => {
  const email = `e2e-deftpl-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Default Tpl WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Default Tpl WS');

  // 📋 メニューを開く → 組み込みテンプレが並ぶ（seed は workspace.create で実行済み）。
  await page.getByTestId('sidebar-templates').click();
  const menu = page.getByTestId('template-menu');
  await expect(menu).toBeVisible({ timeout: 5_000 });
  await expect(menu.getByText('作業計画書')).toBeVisible({ timeout: 5_000 });
  await expect(menu.getByText('議事録')).toBeVisible();
  await expect(menu.locator('[data-testid^="template-item-"]')).toHaveCount(8);

  // 「作業計画書」を選ぶ → 本文付きの新ページへ。
  await menu.getByText('作業計画書').click();
  await page.waitForURL(/\/p\/[0-9A-Z]+$/, { timeout: 10_000 });
  await waitForLive(page);

  // 本文が sync seed 経由で復元される（テンプレの見出し文言が出る）。
  await expect(page.getByTestId('editor-content')).toContainText('目的・非目的', {
    timeout: 10_000,
  });

  await context.close();
});
