import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://kidzplayful-fe2a.vercel.app';
const stamp = String(Date.now()).slice(-6);
const judul = 'Event Full ' + stamp;
const namaAnak = 'AnakUji ' + stamp;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); });

await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});

// 0) buat anak sementara
await p.waitForSelector('input[name=nama]', { timeout: 15000 });
await p.type('input[name=nama]', namaAnak);
await p.$eval('input[name=tanggal_lahir]', (el) => { el.value = '2022-01-01'; });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Tambah anak')); x && x.click(); });
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, namaAnak).catch(() => {});
console.log('0. BUAT ANAK sementara:', namaAnak);

// 1) buat event harga 0
await p.goto(U + '/admin/event', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Tambah Event')); x && x.click(); });
await p.waitForSelector('input[placeholder="Judul event"]', { timeout: 15000 });
await p.type('input[placeholder="Judul event"]', judul);
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Simpan')); x && x.click(); });
await p.waitForFunction((j) => document.body.innerText.includes(j), { timeout: 20000 }, judul).catch(() => {});
console.log('1. BUAT EVENT:', judul);

// 2) daftar
await p.goto(U + '/event', { waitUntil: 'networkidle2', timeout: 30000 });
const href = await p.evaluate((j) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes(j) && d.querySelector('a[href*="/daftar"]'));
  const a = card && card.querySelector('a[href*="/daftar"]');
  return a ? a.getAttribute('href') : null;
}, judul);
const eventId = href ? href.split('/event/')[1].split('/')[0] : null;
await p.goto(U + href, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('input[type=checkbox]', { timeout: 15000 });
const cb = await p.$$('input[type=checkbox]');
await cb[0].click();
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Daftar Sekarang'); x && x.click(); });
const redirect = await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 20000 }).then(() => true).catch(() => false);
const badgeMenunggu = await p.evaluate(() => document.body.innerText.includes('Menunggu verifikasi'));
console.log('2. DAFTAR (user): redirect ke dashboard =', redirect, '| badge Menunggu =', badgeMenunggu);

// 3) admin pendaftar + Terima
await p.goto(U + `/admin/event/${eventId}/pendaftar`, { waitUntil: 'networkidle2', timeout: 30000 });
const namaTampil = await p.evaluate((n) => document.body.innerText.includes(n), namaAnak);
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Terima'); x && x.click(); });
const terima = await p.waitForFunction(() => document.body.innerText.includes('diterima'), { timeout: 15000 }).then(() => 'DITERIMA').catch(() => 'GAGAL');
console.log('3. ADMIN: nama anak tampil =', namaTampil, '| Terima =', terima);

// 3b) cek badge "diterima" di dashboard user
await p.goto(U + '/pilih-anak', { waitUntil: 'networkidle2', timeout: 30000 });
const badgeDiterima = await p.evaluate(() => document.body.innerText.includes('Pendaftaran diterima'));
console.log('3b. BADGE dashboard user = diterima?', badgeDiterima);

// 4) cleanup event
await p.goto(U + '/admin/event', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((j) => {
  const card = [...document.querySelectorAll('div')].reverse().find(d => d.textContent.includes(j) && [...d.querySelectorAll('button')].some(b => b.textContent === 'Hapus'));
  const btn = card && [...card.querySelectorAll('button')].find(b => b.textContent === 'Hapus');
  btn && btn.click();
}, judul);
const evBersih = await p.waitForFunction((j) => !document.body.innerText.includes(j), { timeout: 15000 }, judul).then(() => true).catch(() => false);
console.log('4. CLEANUP event:', evBersih ? 'BERSIH' : 'gagal');

// 5) cleanup anak
await p.goto(U + '/pilih-anak', { waitUntil: 'networkidle2', timeout: 30000 });
const kelolaHref = await p.evaluate((n) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes(n) && d.querySelector('a[href^="/anak/"]'));
  const a = card && card.querySelector('a[href^="/anak/"]');
  return a ? a.getAttribute('href') : null;
}, namaAnak);
let anakBersih = 'tak ditemukan';
if (kelolaHref) {
  await p.goto(U + kelolaHref, { waitUntil: 'networkidle2', timeout: 30000 });
  await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => /Hapus/i.test(b.textContent)); x && x.click(); });
  anakBersih = await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 15000 }).then(() => 'BERSIH').catch(() => 'cek manual');
}
console.log('5. CLEANUP anak:', anakBersih);

await b.close();
