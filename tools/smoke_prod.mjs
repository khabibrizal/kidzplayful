import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'https://kidzplayful-fe2a.vercel.app';
const email = `uji+prod_${process.env.STAMP || Date.now()}@kidzplayful.test`;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await p.goto(`${BASE}/daftar`, { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', email);
await p.type('input[type=password]', 'rahasia123');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname === '/pilih-anak', { timeout: 30000 }).catch(() => {});
const url1 = new URL(p.url()).pathname;
const status = await p.$eval('body', (el) => el.innerText).then((t) => (t.match(/Status langganan:\s*(\w+)/) || [])[1] || '?').catch(() => '?');

// tambah anak
let anakOk = false;
if (url1 === '/pilih-anak') {
  await p.type('input[name=nama]', 'ArkaProd');
  await p.type('input[name=tanggal_lahir]', '2023-01-01');
  await p.click('form button[type=submit]');
  anakOk = await p.waitForFunction(() => document.body.innerText.includes('ArkaProd'), { timeout: 20000 })
    .then(() => true).catch(() => false);
  void sleep;
}

console.log('email      :', email);
console.log('redirect ke:', url1);
console.log('status lang:', status);
console.log('tambah anak:', anakOk ? 'OK' : 'GAGAL');
console.log('errors     :', errs.length ? errs.join(' | ') : 'tidak ada');
console.log('HASIL      :', url1 === '/pilih-anak' && status === 'trial' && anakOk ? 'PROD OK ✓' : 'PERIKSA ✗');
await b.close();
