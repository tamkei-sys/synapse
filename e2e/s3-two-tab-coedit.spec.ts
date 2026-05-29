import { expect, test, type BrowserContext, type Page } from '@playwright/test';

/**
 * S3 acceptance test: two browser contexts editing the same page see each
 * other's edits live, and the merged content survives a reload — proving
 * the Yjs / Hocuspocus pipeline (server CRDT + Postgres persistence +
 * y-indexeddb local cache) round-trips end to end.
 *
 * Covers the Sprint 3 DoD: "Two tabs co-edit without conflict."
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// 認証フォームは日本語化済み（PBI-25 / task 全 UI 日本語化）。ラベルは
// 「お名前」「メールアドレス」「パスワード（8 文字以上）」、送信ボタンは
// 「アカウント作成」/「ログイン」。
async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('S3 User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  // Wait for the post-sign-in redirect to land on '/'. Without this, a
  // following `goto(pageUrl)` can race the auth cookie being set, which
  // makes the next tRPC call see no session and 401 out.
  await page.waitForURL('/');
}

async function waitForLive(page: Page) {
  // The connection-status badge flips to 'connected' once the WS handshake
  // and the Hocuspocus document load both succeed.
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('two tabs co-edit, both see each other, reload persists', async ({ browser }) => {
  const email = `e2e-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // ---- Tab A: sign up, create workspace, create page ----------------------
  const contextA: BrowserContext = await browser.newContext();
  const a = await contextA.newPage();

  await signUp(a, email, password);
  await a.getByTestId('workspace-name-input').fill('Acme');
  await a.getByTestId('create-workspace-submit').click();
  await expect(a.getByTestId('workspace-name')).toHaveText('Acme');

  await a.getByTestId('new-page-button').click();
  await expect(a).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(a);

  const pageUrl = a.url();
  const pageId = pageUrl.split('/p/')[1] ?? '';
  expect(pageId).not.toEqual('');

  // ---- Tab B: same user, second context, navigate to same page ------------
  const contextB: BrowserContext = await browser.newContext();
  const b = await contextB.newPage();
  await signIn(b, email, password);
  await b.goto(pageUrl);
  await waitForLive(b);

  // ---- Cross-edit: A writes, B writes; both should see both lines ---------
  const editorA = a.getByTestId('editor-content');
  const editorB = b.getByTestId('editor-content');

  await editorA.click();
  await editorA.pressSequentially('Hello from A');

  // B observes A's text.
  await expect(editorB).toContainText('Hello from A', { timeout: 10_000 });

  // B adds a second line.
  await editorB.click();
  // Move caret to end before adding text.
  await editorB.press('End');
  await editorB.press('Enter');
  await editorB.pressSequentially('Hello from B');

  // A observes B's text.
  await expect(editorA).toContainText('Hello from B', { timeout: 10_000 });

  // ---- Reload tab A → all content persists --------------------------------
  await a.reload();
  await waitForLive(a);
  const reloadedEditor = a.getByTestId('editor-content');
  await expect(reloadedEditor).toContainText('Hello from A');
  await expect(reloadedEditor).toContainText('Hello from B');

  await contextA.close();
  await contextB.close();
});
