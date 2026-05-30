import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-48 同期ブロック acceptance。
 *
 * ページ A に本文を書く → ページ B で `/sync` → ページ A を選ぶ → A の本文が B の
 * 同期ブロックに read-only で表示される、を検証する。新 ProseMirror ノード
 * （schema 変更）なので別途 s3 (co-edit) も回す。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Sync User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('synced block mirrors another page content', async ({ browser }) => {
  const email = `e2e-sync-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const sourceText = `Synced source ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Sync WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Sync WS');

  // ---- ページ A: source 本文を書く -------------------------------------
  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);
  const pageAId = page.url().match(/\/p\/([0-9A-Z]+)/)?.[1] ?? '';
  expect(pageAId).not.toBe('');
  const editorA = page.getByTestId('editor-content');
  await editorA.click();
  await editorA.pressSequentially(sourceText, { delay: 10 });
  await page.waitForTimeout(3_000); // flush → props.doc

  // ---- ページ B: 同期ブロックで A を参照 -------------------------------
  await page.getByTestId('sidebar-new-page').click();
  // A の URL でも /p/ 形式にマッチするので、A 以外の新ページに遷移するまで待つ
  await page.waitForURL(
    (url) => /\/p\/[0-9A-Z]+$/.test(url.pathname) && !url.pathname.endsWith(pageAId),
  );
  await page.reload(); // 遷移後の editor を確実に初期化する
  await waitForLive(page);
  const editorB = page.getByTestId('editor-content');
  await editorB.click();
  await editorB.pressSequentially('/sync', { delay: 10 });
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('slash-item-sync').click();

  await expect(page.getByTestId('synced-block-picker')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('synced-block-picker').selectOption(pageAId);

  // ---- 同期ブロックに A の本文が表示される -----------------------------
  await expect(page.getByTestId('synced-block')).toContainText(sourceText, { timeout: 10_000 });

  await context.close();
});
