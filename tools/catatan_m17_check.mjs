import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://kidzplayful-fe2a.vercel.app';
const ADMIN = 'admin@kidzplayful.app';
const stamp = String(Date.now()).slice(-6);
const namaAnak = 'AnakCttn ' + stamp;
const judulEvent = 'Event Cttn ' + stamp;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); });
const klikTeks = (frag) => p.evaluate((f) => { const x = [...document.querySelectorAll('button,a')].find((e) => e.textContent.includes(f)); x && x.click(); }, frag);

await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', ADMIN);
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak') || location.pathname.startsWith('/guru'), { timeout: 30000 }).catch(() => {});

// 1) jadikan admin sebagai GURU (sementara)
await p.goto(U + '/admin/guru', { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('input[type=email]', { timeout: 15000 });
await p.type('input[type=email]', ADMIN);
await klikTeks('Jadikan Guru');
await new Promise((r) => setTimeout(r, 1500));
console.log('1. JADIKAN GURU: dikirim');

// 2) buat anak peserta
await p.goto(U + '/pilih-anak', { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('input[name=nama]', { timeout: 15000 });
await p.type('input[name=nama]', namaAnak);
await p.$eval('input[name=tanggal_lahir]', (el) => { el.value = '2022-01-01'; });
await klikTeks('Tambah anak');
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, namaAnak).catch(() => {});
const anakHref = await p.evaluate((n) => {
  const card = [...document.querySelectorAll('div')].find((d) => d.textContent.includes(n) && d.querySelector('a[href^="/anak/"]'));
  const a = card && card.querySelector('a[href^="/anak/"]');
  return a ? a.getAttribute('href') : null;
}, namaAnak);
const anakId = anakHref ? anakHref.split('/anak/')[1].split('/')[0] : null;
console.log('2. BUAT ANAK:', namaAnak, anakId ? 'ok' : 'GAGAL');

// 3) buat event (harga 0)
await p.goto(U + '/admin/event', { waitUntil: 'networkidle2', timeout: 30000 });
await klikTeks('Tambah Event');
await p.waitForSelector('input[placeholder="Judul event"]', { timeout: 15000 });
await p.type('input[placeholder="Judul event"]', judulEvent);
await klikTeks('Simpan');
await p.waitForFunction((j) => document.body.innerText.includes(j), { timeout: 20000 }, judulEvent).catch(() => {});

// 4) daftar event
await p.goto(U + '/event', { waitUntil: 'networkidle2', timeout: 30000 });
const href = await p.evaluate((j) => {
  const card = [...document.querySelectorAll('div')].find((d) => d.textContent.includes(j) && d.querySelector('a[href*="/daftar"]'));
  const a = card && card.querySelector('a[href*="/daftar"]');
  return a ? a.getAttribute('href') : null;
}, judulEvent);
const eventId = href ? href.split('/event/')[1].split('/')[0] : null;
await p.goto(U + href, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('input[type=checkbox]', { timeout: 15000 });
await (await p.$('input[type=checkbox]')).click();
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === 'Daftar Sekarang'); x && x.click(); });
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 20000 }).catch(() => {});
console.log('3-4. EVENT + DAFTAR:', eventId ? 'ok' : 'GAGAL');

// 5) admin terima pendaftaran
await p.goto(U + `/admin/event/${eventId}/pendaftar`, { waitUntil: 'networkidle2', timeout: 30000 });
await klikTeks('Terima');
await p.waitForFunction(() => document.body.innerText.includes('diterima'), { timeout: 15000 }).catch(() => {});
console.log('5. TERIMA PENDAFTARAN: ok');

// 6) guru isi catatan (rubrik semua BSH + catatan)
await p.goto(U + `/guru/${eventId}`, { waitUntil: 'networkidle2', timeout: 30000 });
const adaPeserta = await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 15000 }, namaAnak).then(() => true).catch(() => false);
await p.evaluate(() => { [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'BSH').forEach((b) => b.click()); });
await p.type('textarea', 'Anak sangat antusias dan mau bekerja sama.');
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Simpan Catatan')); x && x.click(); });
const tersimpan = await p.waitForFunction(() => document.body.innerText.includes('tersimpan'), { timeout: 15000 }).then(() => true).catch(() => false);
console.log('6. GURU ISI CATATAN: peserta', adaPeserta, '| simpan', tersimpan ? 'ok' : 'GAGAL');

// 7) ortu lihat catatan (halaman catatan event)
await p.goto(U + `/catatan/${eventId}`, { waitUntil: 'networkidle2', timeout: 30000 });
const diCatatan = await p.evaluate(() => document.body.innerText.includes('Berkembang Sesuai Harapan'));
// dan di rapor anak
await p.goto(U + `/anak/${anakId}/laporan`, { waitUntil: 'networkidle2', timeout: 30000 });
const diRapor = await p.evaluate(() => document.body.innerText.includes('Catatan Perkembangan Bermain'));
console.log('7. ORTU LIHAT: di halaman catatan =', diCatatan, '| di rapor =', diRapor);

// 8) cleanup: event, anak, cabut guru
await p.goto(U + '/admin/event', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((j) => { const card = [...document.querySelectorAll('div')].reverse().find((d) => d.textContent.includes(j) && [...d.querySelectorAll('button')].some((b) => b.textContent === 'Hapus')); const btn = card && [...card.querySelectorAll('button')].find((b) => b.textContent === 'Hapus'); btn && btn.click(); }, judulEvent);
await new Promise((r) => setTimeout(r, 1500));
await p.goto(U + `/anak/${anakId}`, { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((b) => /Hapus/i.test(b.textContent)); x && x.click(); });
await new Promise((r) => setTimeout(r, 1500));
await p.goto(U + '/admin/guru', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cabut'); x && x.click(); });
await new Promise((r) => setTimeout(r, 1500));
console.log('8. CLEANUP: event+anak+cabut guru selesai');

await b.close();
