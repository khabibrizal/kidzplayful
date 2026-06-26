import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://kidzplayful-fe2a.vercel.app';
const stamp = String(Date.now()).slice(-6);
const judul = 'Uji Kelas ' + stamp;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});

await p.goto(U + '/admin/kelas-bermain', { waitUntil: 'networkidle2', timeout: 30000 });
// klik "+ Tambah Kelas Bermain"
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Tambah Kelas Bermain')); b && b.click(); });
await p.waitForSelector('input[placeholder="Judul"]', { timeout: 15000 });
await p.type('input[placeholder="Judul"]', judul);
await p.type('textarea[placeholder^="Aktivitas"]', 'Aktivitas uji ' + stamp);
await p.type('input[placeholder="Bahan"]', 'kertas, lem');
// klik Simpan
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Simpan')); b && b.click(); });

const muncul = await p.waitForFunction((j) => document.body.innerText.includes(j), { timeout: 20000 }, judul).then(() => true).catch(() => false);
console.log('judul:', judul);
console.log('HASIL TAMBAH:', muncul ? 'BERHASIL (muncul di daftar admin)' : 'GAGAL');
await b.close();
