import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-79 コマンドパレット (Cmd+K) — アクション横断ジャンプ acceptance。
 *
 * Cmd+K でパレットを開き、「移動」アクションから各画面へジャンプできることを検証。
 * （検索 hit は Typesense 依存のため、ここでは常時利用できるアクション導線を確認）
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Palette User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('Cmd+K palette navigates via action', async ({ browser }) => {
  const email = `e2e-cp-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Palette WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Palette WS');

  // ---- Cmd+K（Meta+k）でパレットを開く --------------------------------
  await page.locator('body').click();
  await page.keyboard.press('Meta+k');
  await expect(page.getByTestId('command-palette')).toBeVisible({ timeout: 5_000 });

  // ---- 「移動」アクションが並ぶ → プロジェクトへジャンプ ---------------
  await expect(page.getByTestId('command-action-go-project')).toBeVisible();
  await page.getByTestId('command-action-go-project').click();
  await expect(page).toHaveURL(/\/project$/);
  await expect(page.getByTestId('command-palette')).toHaveCount(0);

  // ---- 再度開いて、クエリでアクションを絞り込み -----------------------
  await page.locator('body').click();
  await page.keyboard.press('Meta+k');
  await page.getByTestId('command-palette-input').fill('ゴミ箱');
  await expect(page.getByTestId('command-action-go-trash')).toBeVisible();
  await page.getByTestId('command-action-go-trash').click();
  await expect(page).toHaveURL(/\/trash$/);

  await context.close();
});
