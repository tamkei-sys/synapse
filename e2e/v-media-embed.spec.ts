import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-41 動画/音声の埋め込み acceptance。
 *
 * エディタで `/video` → 動画を選ぶ → controls 付きの video プレーヤーが
 * 挿入され、リロード後も残る（Yjs 永続）という end-to-end を検証する。
 * audio ノードは video と同型実装なので E2E は video を代表に検証する。
 *
 * media ノード追加は ProseMirror schema 変更なので、別途 s3 (co-edit) も
 * 回して Yjs 互換を確認する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Media User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('embedding a video inserts a player that persists', async ({ browser }) => {
  const email = `e2e-media-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Media WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Media WS');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /video スラッシュ → 動画選択 ------------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/video');
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('slash-item-video')).toBeVisible();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('slash-item-video').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'clip.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('fake-video-bytes-for-test'),
  });

  // ---- video プレーヤーが挿入される -------------------------------------
  await expect(page.getByTestId('video-node')).toBeVisible({ timeout: 10_000 });

  // ---- store flush を待ってリロード → 永続化を確認 ----------------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('video-node')).toBeVisible({ timeout: 10_000 });

  await context.close();
});
