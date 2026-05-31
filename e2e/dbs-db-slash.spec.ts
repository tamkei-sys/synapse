import { expect, test, type Page } from '@playwright/test';

/**
 * /db スラッシュコマンド acceptance。
 *
 * /help に「『/db』で任意スキーマのデータベースを作成できます」と記載があるので、
 * エディタで /db を打つとメニューに出て、選ぶと DB が作成され本文にリンクが
 * 挿入されることを検証する（以前は「該当するコマンドがありません」だった）。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('DbSlash User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('/db slash command creates a database and links it', async ({ browser }) => {
  const email = `e2e-dbs-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const dbName = `Inline DB ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('DbSlash WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('DbSlash WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /db でメニューに出る（以前は「該当なし」だった）-----------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/db');
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('slash-item-db')).toBeVisible();

  // ---- 選択 → DB 名入力 → 本文にリンク挿入 ----------------------------
  page.once('dialog', (d) => void d.accept(dbName));
  await page.getByTestId('slash-item-db').click();

  // 本文に DB へのリンク（📚 + /b/ href）が挿入される
  const link = editor.locator('a[href^="/b/"]').filter({ hasText: dbName }).first();
  await expect(link).toBeVisible({ timeout: 10_000 });

  await context.close();
});
