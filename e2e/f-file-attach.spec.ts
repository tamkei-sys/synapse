import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-40 ファイル添付 acceptance。
 *
 * エディタで `/file` → ファイルを選ぶ → 「📎 ファイル名」のダウンロード
 * ノードが挿入され、リロード後も残る（Yjs 永続）という end-to-end を検証する。
 *
 * file ノード追加は ProseMirror schema 変更なので、別途 s3 (co-edit) も回して
 * Yjs 互換を確認する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('File User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('attaching a file inserts a download node that persists', async ({ browser }) => {
  const email = `e2e-file-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const fileName = `spec-${unique()}.txt`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('File WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('File WS');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /file スラッシュ → ファイル選択 ----------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/file');
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('slash-item-file')).toBeVisible();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('slash-item-file').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: fileName,
    mimeType: 'text/plain',
    buffer: Buffer.from('hello attachment body'),
  });

  // ---- ファイルノードが挿入され、ファイル名が見える ---------------------
  await expect(page.getByTestId('file-node')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('file-node')).toContainText(fileName);

  // ---- store flush を待ってリロード → 永続化を確認 ----------------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('file-node')).toContainText(fileName, { timeout: 10_000 });

  await context.close();
});
