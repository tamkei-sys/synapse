import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-45 カラム / 多段組 acceptance。
 *
 * エディタで `/columns` → 2 カラムの段組が挿入され、列に文字を書けて、リロード後も
 * 残る（Yjs 永続）を検証する。columnList/column は新 ProseMirror ノード（schema
 * 変更）なので、別途 s3 (co-edit) も回して Yjs 互換を確認する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Column User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('inserting columns creates a multi-column layout that persists', async ({ browser }) => {
  const email = `e2e-col-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Column WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Column WS');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /columns スラッシュ → 2 カラム挿入 -------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/columns');
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('slash-item-columns')).toBeVisible();
  await page.getByTestId('slash-item-columns').click();

  await expect(page.locator('[data-column-list]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-column]')).toHaveCount(2);

  // ---- 左カラムに文字を入力 ---------------------------------------------
  await page.locator('[data-column]').first().click();
  await page.keyboard.type('Left column text');
  await expect(editor).toContainText('Left column text');

  // ---- flush を待ってリロード → 永続化を確認 ----------------------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.locator('[data-column-list]')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('editor-content')).toContainText('Left column text');

  await context.close();
});
