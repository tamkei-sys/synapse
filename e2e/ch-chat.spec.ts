import { expect, test, type Page } from '@playwright/test';

/**
 * Slack 風チャット (PBI-94) acceptance。
 *
 * /chat でチャンネル作成 → メッセージ送信 → 一覧表示 → リアクション付与、を検証する。
 * chat は block(type=chat_channel/chat_message)で ProseMirror/Yjs schema には触れない
 * ので s3 は不要。リアルタイムは polling。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Chat User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('create a channel, send a message, react to it', async ({ browser }) => {
  const email = `e2e-ch-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const channelName = `general-${unique()}`;
  const msg = `Hello chat ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Chat WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Chat WS');

  // ---- /chat → チャンネル作成（prompt） -------------------------------
  await page.goto('/chat');
  await expect(page.getByTestId('chat-new-channel')).toBeVisible({ timeout: 10_000 });
  page.once('dialog', (d) => void d.accept(channelName));
  await page.getByTestId('chat-new-channel').click();
  await expect(page.getByTestId('chat-channel-list')).toContainText(channelName, { timeout: 10_000 });

  // ---- メッセージ送信 → 表示 ------------------------------------------
  await page.getByTestId('chat-input').fill(msg);
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('chat-messages')).toContainText(msg, { timeout: 10_000 });

  // ---- リアクション（hover ピッカーから 👍）→ カウント表示 ------------
  const message = page.locator('[data-testid^="chat-message-"]').filter({ hasText: msg }).first();
  const msgId = (await message.getAttribute('data-testid'))?.replace('chat-message-', '') ?? '';
  expect(msgId).not.toBe('');
  // ピッカーは group-hover 表示なので、行を hover してからクリック。
  await message.hover();
  await message.getByTestId(`chat-react-pick-${msgId}-👍`).click();
  await expect(page.getByTestId(`chat-reaction-${msgId}-👍`)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId(`chat-reaction-${msgId}-👍`)).toHaveAttribute('data-active', 'true');

  await context.close();
});
