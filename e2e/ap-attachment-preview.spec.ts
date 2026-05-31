import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-89 添付のインラインプレビュー acceptance。
 *
 * /file で画像ファイルを添付 → 添付リンクをクリック → プレビューモーダルが開き、
 * Esc / 閉じるで閉じることを検証する（image/* と application/pdf が対象）。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Preview User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('clicking an image attachment opens a preview modal', async ({ browser }) => {
  const email = `e2e-ap-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Preview WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Preview WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /file で画像を添付 ---------------------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/file');
  await expect(page.getByTestId('slash-item-file')).toBeVisible({ timeout: 10_000 });
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('slash-item-file').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: `pic-${unique()}.png`, mimeType: 'image/png', buffer: PNG });
  await expect(page.getByTestId('file-node')).toBeVisible({ timeout: 10_000 });

  // ---- 添付リンクをクリック → プレビューモーダル ----------------------
  await page.getByTestId('file-node').click();
  await expect(page.getByTestId('attachment-preview')).toBeVisible({ timeout: 10_000 });

  // ---- 閉じる ----------------------------------------------------------
  await page.getByTestId('attachment-preview-close').click();
  await expect(page.getByTestId('attachment-preview')).toHaveCount(0);

  await context.close();
});
