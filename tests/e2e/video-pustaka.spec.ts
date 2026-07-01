// tests/e2e/video-pustaka.spec.ts
import { test, expect } from '@playwright/test';

test('pojok video tampil + game edukasi >1 tema', async ({ page }) => {
  const email = `uji+m3_${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;

  await page.goto('/pilih-anak');
  await page.waitForURL('**/login', { timeout: 90000 });
  await page.goto('/daftar');
  await page.fill('input[placeholder="Nama orang tua"]', 'Bunda Uji');
  await page.fill('input[type=tel]', '081234567890');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });
  await page.fill('input[name=nama]', 'Arka');
  await page.fill('input[name=tanggal_lahir]', '2023-01-01');
  await page.click('form button[type=submit]');
  await expect(page.getByText('Arka')).toBeVisible({ timeout: 30000 });

  await page.getByText('Arka').first().click();
  await page.waitForURL('**/main/**', { timeout: 90000 });
  await expect(page.getByText('Pojok Video')).toBeVisible({ timeout: 60000 });

  // Pojok Video: buka, lihat daftar video, putar 1
  await page.getByText('Pojok Video').click();
  await expect(page.getByText('Mengenal Suara Hewan')).toBeVisible();
  await page.getByText('Mengenal Suara Hewan').click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com/);

  // kembali ke menu lalu buka Game Edukasi -> harus >1 tema (Hewan + Buah)
  await page.getByText('Selesai nonton').click();
  await page.getByText('Kembali').click();
  await page.getByText('Game Edukasi').click();
  await expect(page.getByText('Hewan')).toBeVisible();
  await expect(page.getByText('Buah')).toBeVisible();
});
