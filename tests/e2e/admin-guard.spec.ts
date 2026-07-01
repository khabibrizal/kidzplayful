// tests/e2e/admin-guard.spec.ts
import { test, expect } from '@playwright/test';

test('non-admin ditolak dari /admin', async ({ page }) => {
  const email = `uji+m4_${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;
  await page.goto('/pilih-anak');
  await page.waitForURL('**/login', { timeout: 90000 });
  await page.goto('/daftar');
  await page.fill('input[placeholder="Nama orang tua"]', 'Bunda Uji');
  await page.fill('input[type=tel]', '081234567890');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });

  // user baru bukan admin -> /admin harus redirect ke /pilih-anak
  await page.goto('/admin');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });
  await expect(page).toHaveURL(/\/pilih-anak/);
});
