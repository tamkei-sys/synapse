import { expect, test, type Page } from '@playwright/test';

/**
 * DB 列の編集（リネーム / 削除 / 型変更）acceptance。
 *
 * 以前はデフォルト列（タイトル/ステータス/期限）を含め列の編集ができなかった。
 * 列ヘッダのメニューからリネームできること、削除できることを検証する。
 * （型変更時のセル値変換は coerceCellValue のユニットで担保）
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('ColEdit User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('rename and delete a database column', async ({ browser }) => {
  const email = `e2e-ce-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const newName = `Renamed ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('ColEdit WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('ColEdit WS');

  // ---- DB 作成（デフォルト列: title/status/due）------------------------
  await page.goto('/db');
  await page.getByTestId('db-create-title').fill('Column Edit DB');
  await page.getByTestId('db-create-submit').click();
  await expect(page).toHaveURL(/\/b\/[0-9A-Z]+$/);
  await expect(page.getByTestId('db-col-title')).toBeVisible({ timeout: 10_000 });

  // ---- title 列をリネーム ---------------------------------------------
  await page.getByTestId('db-col-menu-title').click();
  await expect(page.getByTestId('db-col-editor-title')).toBeVisible();
  await page.getByTestId('db-col-name-title').fill(newName);
  await page.getByTestId('db-col-save-title').click();
  await expect(page.getByTestId('db-col-title')).toContainText(newName, { timeout: 10_000 });

  // ---- due 列を削除（確認ダイアログを accept）-------------------------
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('db-col-menu-due').click();
  await page.getByTestId('db-col-delete-due').click();
  await expect(page.getByTestId('db-col-due')).toHaveCount(0, { timeout: 10_000 });

  await context.close();
});
