// tests/e2e/pick-game.spec.ts
import { test, expect } from '@playwright/test';

test('pilih game per anak -> langsung main', async ({ page }) => {
  const email = `uji+pg_${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;

  await page.goto('/pilih-anak');
  await page.waitForURL('**/login', { timeout: 90000 });
  await page.goto('/daftar');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });
  await page.fill('input[name=nama]', 'Arka');
  await page.fill('input[name=tanggal_lahir]', '2023-01-01');
  await page.click('form button[type=submit]');
  await expect(page.getByText('Arka')).toBeVisible({ timeout: 30000 });

  // buka Pilih Game untuk anak
  await page.getByText('Pilih game (orang tua)').first().click();
  await page.waitForURL('**/pilih-game/**', { timeout: 90000 });
  await expect(page.getByText(/Pilih untuk/)).toBeVisible({ timeout: 60000 });

  // klik kartu game pertama -> harus deep-link ke Mode Anak dgn ?paket=
  await page.getByText('main ▶').first().click();
  await page.waitForURL(/\/main\/.*paket=/, { timeout: 90000 });
  expect(page.url()).toMatch(/paket=/);
});
