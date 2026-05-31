import { expect, test, type Page } from '@playwright/test';

/**
 * dbEmbed（DB をエディタ本文に埋め込み）acceptance。
 *
 * /db で DB を作成し、本文に dbEmbed ノードが挿入されて DbView（ビュータブ等）が
 * その場に描画されることを検証する。新 ProseMirror ノード（schema 変更）のため
 * s3 co-edit も別途回す。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('DbEmbed User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('/db embeds an interactive database in the page body', async ({ browser }) => {
  const email = `e2e-de-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('DbEmbed WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('DbEmbed WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /db → 本文に DB が埋め込まれる ---------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/db');
  await expect(page.getByTestId('slash-item-db')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('slash-item-db').click();

  // dbEmbed ノードが現れ、DbView（ビュータブ）がその場に描画される
  const embed = page.locator('[data-testid^="db-embed-"]').first();
  await expect(embed).toBeVisible({ timeout: 10_000 });
  await expect(embed.getByTestId('db-view-tab-form')).toBeVisible();

  // ---- フォームビューで 1 行追加できる（インライン操作） --------------
  await embed.getByTestId('db-view-tab-form').click();
  await expect(embed.getByTestId('db-form-view')).toBeVisible();

  // ---- flush 後リロードしても埋め込みが残る（Yjs 永続） ---------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.locator('[data-testid^="db-embed-"]').first()).toBeVisible({ timeout: 10_000 });

  await context.close();
});
