import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://kidzplayful-fe2a.vercel.app';
const stamp = String(Date.now()).slice(-6);
const judul = 'M13 Uji ' + stamp;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); }); // auto-terima confirm() saat hapus

await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});

await p.goto(U + '/admin/kelas-bermain', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Tambah Kelas Bermain')); x && x.click(); });
await p.waitForSelector('input[placeholder="Judul kelas"]', { timeout: 15000 });

await p.type('input[placeholder="Judul kelas"]', judul);
await p.type('input[placeholder="Nama bahan"]', 'Cat air');
await p.type('input[placeholder="Link toko (opsional)"]', 'https://tokopedia.com/contoh');
await p.type('input[placeholder="Judul aktivitas"]', 'Cap Daun');
await p.type('textarea[placeholder="Cara membuat"]', 'Campur cat dengan sedikit air');
await p.type('input[placeholder="langkah..."]', 'Celupkan daun ke cat');
// tambah aktivitas kedua
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '+ tambah aktivitas'); x && x.click(); });
await new Promise(r => setTimeout(r, 400));
const judulAkt = await p.$$('input[placeholder="Judul aktivitas"]');
await judulAkt[1].type('Lukis Jari');

// Simpan
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Simpan')); x && x.click(); });
const muncul = await p.waitForFunction((j) => document.body.innerText.includes(j), { timeout: 20000 }, judul).then(() => true).catch(() => false);
console.log('judul:', judul);
console.log('TAMBAH (skema baru):', muncul ? 'BERHASIL' : 'GAGAL');

// cek ringkasan "2 aktivitas"
const ringkas = await p.evaluate((j) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes(j) && d.textContent.includes('aktivitas'));
  return card ? card.innerText.split('\n').find(l => l.includes('aktivitas')) : null;
}, judul);
console.log('Ringkasan:', ringkas);

// bersihkan: hapus entri uji
await p.evaluate((j) => {
  const cards = [...document.querySelectorAll('div')];
  const card = cards.reverse().find(d => d.textContent.includes(j) && [...d.querySelectorAll('button')].some(b => b.textContent === 'Hapus'));
  const btn = card && [...card.querySelectorAll('button')].find(b => b.textContent === 'Hapus');
  btn && btn.click();
}, judul);
const terhapus = await p.waitForFunction((j) => !document.body.innerText.includes(j), { timeout: 15000 }, judul).then(() => true).catch(() => false);
console.log('CLEANUP hapus uji:', terhapus ? 'BERSIH' : 'masih ada');

await b.close();
