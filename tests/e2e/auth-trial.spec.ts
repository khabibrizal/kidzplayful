// tests/e2e/auth-trial.spec.ts
import { test, expect } from '@playwright/test';

test('daftar -> trial aktif -> tambah anak', async ({ page }) => {
  const email = `uji+${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;
  await page.goto('/daftar');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');

  await page.waitForURL('**/pilih-anak');
  await expect(page.getByText(/Status langganan/)).toContainText(/trial/);

  await page.fill('input[name=nama]', 'Arka');
  await page.fill('input[name=tanggal_lahir]', '2023-01-01');
  await page.click('form button[type=submit]');

  await expect(page.getByText('Arka')).toBeVisible();
});
