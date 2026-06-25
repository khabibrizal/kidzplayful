// tests/e2e/main-game.spec.ts
import { test, expect } from '@playwright/test';

test('mode anak: main Mana Ya -> reward', async ({ page }) => {
  const email = `uji+m2_${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;

  // warmup rute lambat
  await page.goto('/pilih-anak');
  await page.waitForURL('**/login', { timeout: 90000 });

  await page.goto('/daftar');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });

  // tambah anak usia 3 (mode anak)
  await page.fill('input[name=nama]', 'Arka');
  await page.fill('input[name=tanggal_lahir]', '2023-01-01');
  await page.click('form button[type=submit]');
  await expect(page.getByText('Arka')).toBeVisible({ timeout: 30000 });

  // masuk mode anak
  await page.getByText('Arka').click();
  await page.waitForURL('**/main/**', { timeout: 90000 });
  await expect(page.getByText('Main Minggu Ini')).toBeVisible({ timeout: 60000 });

  // buka daftar game lalu mulai Mana Ya?
  await page.getByText('Main Minggu Ini').click();
  await page.getByText('Mana Ya?').click();

  // jawab 5 ronde: klik tombol berisi emoji benar
  const benar = ['🐱', '🐶', '🦆', '🐘', '🐮'];
  for (const emo of benar) {
    await page.getByRole('button', { name: emo }).click();
    await page.waitForTimeout(1000);
  }

  await expect(page.getByText('Hebat!')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/koin/)).toBeVisible();
});
