import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-116 Mermaid 図 acceptance。
 *
 * エディタで `/mermaid` → スターター図の mermaidBlock が入り、遅延ロードの
 * mermaid が SVG を描画する。リロード後も Yjs から復元して再描画される。
 */
const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Mermaid User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill('correct horse battery staple');
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('mermaid diagram renders from /mermaid and persists across reload', async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, `e2e-mermaid-${unique()}@synapse.test`);
  await page.getByTestId('workspace-name-input').fill('Mermaid WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Mermaid WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /mermaid でスターター図を挿入 -----------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/mermaid');
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('slash-item-mermaid').click();

  // 遅延ロードの mermaid が SVG を描画する（初回はチャンク取得分の余裕を持つ）。
  await expect(page.getByTestId('mermaid-view')).toBeVisible({ timeout: 25_000 });
  await expect(page.getByTestId('mermaid-svg').locator('svg')).toBeVisible({ timeout: 25_000 });

  // ---- flush 待ち → リロードしても復元して再描画される -----------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('mermaid-svg').locator('svg')).toBeVisible({ timeout: 25_000 });

  await context.close();
});
