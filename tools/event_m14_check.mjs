import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://kidzplayful-fe2a.vercel.app';
const stamp = String(Date.now()).slice(-6);
const judul = 'Event Uji ' + stamp;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); });

const login = async () => {
  await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await p.type('input[type=email]', 'admin@kidzplayful.app');
  await p.type('input[type=password]', 'Kidz!admin2026');
  await p.click('button[type=submit]');
  await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});
};
await login();

// 1) buat event (harga 0)
await p.goto(U + '/admin/event', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Tambah Event')); x && x.click(); });
await p.waitForSelector('input[placeholder="Judul event"]', { timeout: 15000 });
await p.type('input[placeholder="Judul event"]', judul);
await p.type('input[placeholder="Lokasi event"]', 'KidzPlayful Playground, Sidoarjo');
await p.type('textarea[placeholder="Deskripsi event"]', 'Event uji otomatis');
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Simpan')); x && x.click(); });
const adaAdmin = await p.waitForFunction((j) => document.body.innerText.includes(j), { timeout: 20000 }, judul).then(() => true).catch(() => false);
console.log('1. BUAT EVENT (admin):', adaAdmin ? 'BERHASIL' : 'GAGAL');

// 2) carousel di dashboard
await p.goto(U + '/pilih-anak', { waitUntil: 'networkidle2', timeout: 30000 });
const adaCarousel = await p.evaluate((j) => document.body.innerText.includes(j) && document.body.innerText.includes('Daftar Sekarang'), judul);
console.log('2. CAROUSEL DASHBOARD:', adaCarousel ? 'TAMPIL' : 'TIDAK');

// 3) buka halaman daftar event
await p.goto(U + '/event', { waitUntil: 'networkidle2', timeout: 30000 });
const href = await p.evaluate((j) => {
  const cards = [...document.querySelectorAll('div')];
  const card = cards.find(d => d.textContent.includes(j) && d.querySelector('a[href*="/daftar"]'));
  const a = card && card.querySelector('a[href*="/daftar"]');
  return a ? a.getAttribute('href') : null;
}, judul);
let eventId = null, daftarOk = 'SKIP (tak ada anak)', terima = 'SKIP';
if (href) {
  eventId = href.split('/event/')[1].split('/')[0];
  await p.goto(U + href, { waitUntil: 'networkidle2', timeout: 30000 });
  await p.waitForFunction((j) => document.body.innerText.includes(j), { timeout: 15000 }, judul).catch(() => {});
  const cb = await p.$$('input[type=checkbox]');
  console.log('3. HALAMAN DAFTAR: render OK, jumlah anak =', cb.length);
  if (cb.length > 0) {
    await cb[0].click();
    await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Daftar Sekarang'); x && x.click(); });
    daftarOk = await p.waitForFunction(() => document.body.innerText.includes('Pendaftaran terkirim'), { timeout: 20000 }).then(() => 'BERHASIL').catch(() => 'GAGAL');
  }
}
console.log('4. DAFTAR (user):', daftarOk);

// 5) admin lihat pendaftar + Terima
if (eventId && daftarOk === 'BERHASIL') {
  await p.goto(U + `/admin/event/${eventId}/pendaftar`, { waitUntil: 'networkidle2', timeout: 30000 });
  const adaPendaftar = await p.evaluate(() => document.body.innerText.includes('menunggu'));
  await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Terima'); x && x.click(); });
  terima = await p.waitForFunction(() => document.body.innerText.includes('diterima'), { timeout: 15000 }).then(() => 'DITERIMA').catch(() => 'GAGAL');
  console.log('5. ADMIN PENDAFTAR:', adaPendaftar ? 'ada' : 'kosong', '| Terima:', terima);
}

// 6) cleanup: hapus event
await p.goto(U + '/admin/event', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((j) => {
  const card = [...document.querySelectorAll('div')].reverse().find(d => d.textContent.includes(j) && [...d.querySelectorAll('button')].some(b => b.textContent === 'Hapus'));
  const btn = card && [...card.querySelectorAll('button')].find(b => b.textContent === 'Hapus');
  btn && btn.click();
}, judul);
const bersih = await p.waitForFunction((j) => !document.body.innerText.includes(j), { timeout: 15000 }, judul).then(() => true).catch(() => false);
console.log('6. CLEANUP hapus event:', bersih ? 'BERSIH' : 'masih ada');

await b.close();
