import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://kidzplayful-fe2a.vercel.app';
const TEMA = '24ca822f-e733-4a8d-967d-115b84277af2'; // Hewan
const stamp = String(Date.now()).slice(-6);
const judul = 'Bermain Tekstur ' + stamp;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});

await p.goto(U + '/admin/kelas-bermain/' + TEMA, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('input[placeholder^="Judul"]', { timeout: 30000 });

// kosongkan judul lalu isi
await p.$eval('input[placeholder^="Judul"]', el => (el.value = ''));
await p.type('input[placeholder^="Judul"]', judul);
await p.type('textarea[placeholder^="Aktivitas"]', 'Meremas kain bertekstur ' + stamp);
await p.type('input[placeholder^="Bahan"]', 'kain, kapas');
await p.type('textarea[placeholder^="Cara membuat"]', 'Tempel kain di papan.');

// klik tombol "Simpan panduan"
await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Simpan panduan'));
  btn && btn.click();
});

// simpan() -> reload; tunggu judul terisi nilai kita setelah reload
const ok = await p.waitForFunction(
  (j) => { const el = document.querySelector('input[placeholder^="Judul"]'); return el && el.value === j; },
  { timeout: 30000 }, judul
).then(() => true).catch(() => false);

console.log('judul disimpan:', judul);
console.log('HASIL:', ok ? 'SIMPAN BERHASIL (judul tersimpan & tampil setelah reload)' : 'GAGAL / PERIKSA');
await b.close();
