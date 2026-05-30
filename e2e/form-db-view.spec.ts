import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-66 DB Form ビュー acceptance。
 *
 * DB を作成 → Form ビュータブ → 列ごとの入力（タイトル/ステータス）→ 追加 →
 * テーブルビューに行が現れる、を検証する。DB のみで ProseMirror/Yjs には触れない
 * ので s3 は不要。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Form User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('db form view adds a row', async ({ browser }) => {
  const email = `e2e-form-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const rowText = `Form row ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Form WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Form WS');

  // ---- DB 作成 ----------------------------------------------------------
  await page.goto('/db');
  await page.getByTestId('db-create-title').fill('Form Test DB');
  await page.getByTestId('db-create-submit').click();
  await expect(page).toHaveURL(/\/b\/[0-9A-Z]+$/);
  const dbId = page.url().match(/\/b\/([0-9A-Z]+)/)?.[1] ?? '';
  expect(dbId).not.toBe('');

  // ---- Form ビュー → 入力 → 追加 ---------------------------------------
  await expect(page.getByTestId('db-view-tab-form')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('db-view-tab-form').click();
  await expect(page.getByTestId('db-form-view')).toBeVisible();
  await page.getByTestId('db-form-field-title').fill(rowText);
  await page.getByTestId('db-form-field-status').selectOption('進行中');
  await page.getByTestId('db-form-submit').click();

  // ---- テーブルビューに行が追加されている ------------------------------
  await page.getByTestId('db-view-tab-table').click();
  await expect(page.getByTestId('db-row-count')).toContainText('1/1', { timeout: 10_000 });
  // テーブルのセルは編集可能 input なので value で確認（textContent には出ない）。
  await expect(page.getByTestId(`db-view-${dbId}`).locator('table input').first()).toHaveValue(
    rowText,
  );

  await context.close();
});
