import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-108 ドキュメント AI 要点 acceptance。
 *
 * 既定テンプレ（本文あり）から作ったページで「📑 → 要点を生成」を押すと、
 * ai.summarizePage が本文を要約して props.aiSummary に保存し、パネルに表示される。
 * ANTHROPIC_API_KEY 未設定でも ask() の stub が返るので要点欄は埋まる。
 */
const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('AI Summary User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill('correct horse battery staple');
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('generating an AI summary fills the 要点 panel', async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, `e2e-aisum-${unique()}@synapse.test`);
  await page.getByTestId('workspace-name-input').fill('AISum WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('AISum WS');

  // 本文付きの既定テンプレ（作業計画書）から新ページを作る。
  await page.getByTestId('sidebar-templates').click();
  const menu = page.getByTestId('template-menu');
  await expect(menu).toBeVisible({ timeout: 5_000 });
  await menu.getByRole('button', { name: '作業計画書' }).dispatchEvent('click');
  await page.waitForURL(/\/p\/[0-9A-Z]+$/, { timeout: 10_000 });

  // 📑 パネル → 要点を生成 → 要点が表示される。
  await page.getByTestId('page-doc-meta-button').click();
  await expect(page.getByTestId('doc-meta-panel')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('doc-summarize-button').click();
  await expect(page.getByTestId('doc-ai-summary')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('doc-ai-summary')).not.toBeEmpty();

  await context.close();
});
