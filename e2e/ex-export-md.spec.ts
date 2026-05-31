import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-88 Markdown エクスポート acceptance。
 *
 * エディタに本文を書いて「⬇️ MD」を押すと .md ファイルがダウンロードされることを
 * 検証する。PDF は window.print（ブラウザネイティブ）のため E2E 対象外。MD/HTML の
 * コピー・取り込みは既存実装。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Export User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('export the document as a markdown file', async ({ browser }) => {
  const email = `e2e-ex-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Export WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Export WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- 本文を書く ------------------------------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('Exportable content', { delay: 8 });

  // ---- ⬇️ MD でダウンロード発火 ---------------------------------------
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('fmt-download-md').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/);

  await context.close();
});
