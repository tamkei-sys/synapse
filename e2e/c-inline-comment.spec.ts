import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-70 インラインコメント acceptance。
 *
 * 本文を選択 → BubbleMenu の 💬 → コンポーザに入力 → 投稿すると、選択範囲が
 * ハイライト（comment mark）され、コメントパネルにスレッドが現れる。返信も
 * できる。comment mark は ProseMirror schema 変更なので s3 と併せて回す。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Comment User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('select text → comment → highlight + thread, then reply', async ({ browser }) => {
  const email = `e2e-cm-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Comment WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Comment WS');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // 本文を入力して段落を 3 クリック選択。
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('Comment this sentence');
  await editor.click({ clickCount: 3 });

  // BubbleMenu の 💬 でコメント起票。
  await expect(page.getByTestId('bubble-menu')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('bubble-comment').click();

  // コンポーザに入力 → 投稿。
  await expect(page.getByTestId('comment-composer')).toBeVisible();
  await page.getByTestId('comment-composer-input').fill('これは最初のコメントです');
  await page.getByTestId('comment-composer-submit').click();

  // ハイライト（comment mark）が本文に付く。
  await expect(page.locator('[data-comment-thread-id]')).toBeVisible({ timeout: 10_000 });
  // パネルにスレッドが出る。
  const panel = page.getByTestId('comments-panel');
  await expect(panel).toContainText('これは最初のコメントです', { timeout: 10_000 });

  // 返信する。
  const thread = panel.locator('[data-testid^="comment-thread-"]').first();
  await thread.locator('[data-testid^="comment-reply-input-"]').fill('返信だよ');
  await thread.locator('[data-testid^="comment-reply-submit-"]').click();
  await expect(panel).toContainText('返信だよ', { timeout: 10_000 });

  await context.close();
});
