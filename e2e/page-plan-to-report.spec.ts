import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-109 計画書→報告書ワンクリック生成 acceptance。
 *
 * 作業計画書テンプレから作ったページの「📑 → 報告書を作成」で、対応する
 * 作業報告書テンプレからページが生成され、元計画書へのリンク（linkedFromPageId）
 * が張られる。
 */
const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Plan2Report User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill('correct horse battery staple');
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}
const idOf = (u: string) => u.split('/p/')[1] ?? '';

test('creating a report from a plan links back to the plan', async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, `e2e-p2r-${unique()}@synapse.test`);
  await page.getByTestId('workspace-name-input').fill('P2R WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('P2R WS');

  // 作業計画書テンプレから計画書ページを作る。
  await page.getByTestId('sidebar-templates').click();
  const menu = page.getByTestId('template-menu');
  await expect(menu).toBeVisible({ timeout: 5_000 });
  await menu.getByRole('button', { name: '作業計画書' }).dispatchEvent('click');
  await page.waitForURL(/\/p\/[0-9A-Z]+$/, { timeout: 10_000 });
  const planId = idOf(page.url());

  // 📑 → 報告書を作成 → 報告書ページへ遷移（別 id）。
  await page.getByTestId('page-doc-meta-button').click();
  await expect(page.getByTestId('doc-meta-panel')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('create-report-button').click();
  await page.waitForURL((u) => /\/p\/[0-9A-Z]+$/.test(u.pathname) && idOf(u.href) !== planId, {
    timeout: 10_000,
  });

  // 報告書ページの 📑 に「元の計画書」リンクが出る。
  await page.getByTestId('page-doc-meta-button').click();
  await expect(page.getByTestId('doc-meta-panel')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('linked-plan-link')).toBeVisible({ timeout: 5_000 });

  // リンクで元計画書へ戻れる。
  await page.getByTestId('linked-plan-link').click();
  await page.waitForURL((u) => idOf(u.href) === planId, { timeout: 10_000 });

  await context.close();
});
