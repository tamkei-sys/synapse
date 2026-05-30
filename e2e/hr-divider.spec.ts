import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-49 区切り線の色 acceptance。
 *
 * エディタで `/divider` → 水平線が入り、ホバーで出る色スウォッチをクリックすると
 * 線の色が変わり、リロード後も保持される（Yjs 永続）を検証する。horizontalRule を
 * 自前ノードに差し替える schema 変更なので、別途 s3 (co-edit) も回す。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Divider User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('divider color can be changed and persists', async ({ browser }) => {
  const email = `e2e-hr-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Divider WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Divider WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /divider で区切り線を挿入 ---------------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/divider');
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('slash-item-divider').click();
  await expect(page.locator('[data-hr-wrap]')).toBeVisible({ timeout: 10_000 });

  // ---- ホバーして色スウォッチで赤に変更 --------------------------------
  await page.locator('[data-hr-wrap]').hover();
  await page.locator('[data-hr-color="red"]').click({ force: true });
  await expect(page.locator('[data-hr-wrap] hr')).toHaveAttribute('data-color', 'red');

  // ---- flush を待ってリロード → 色が保持される ------------------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.locator('[data-hr-wrap] hr')).toHaveAttribute('data-color', 'red', {
    timeout: 10_000,
  });

  await context.close();
});
