import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://kidzplayful-fe2a.vercel.app';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});

async function ukur(path, label) {
  const t0 = Date.now();
  const resp = await p.goto(U + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const dcl = Date.now() - t0;
  // warm (kedua)
  const t1 = Date.now();
  await p.goto(U + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const warm = Date.now() - t1;
  console.log(`${label.padEnd(14)} status=${resp.status()}  cold=${dcl}ms  warm=${warm}ms`);
}
await ukur('/pilih-anak', 'Beranda');
await ukur('/kelas-saya', 'Kelas Bermain');
await ukur('/event', 'Event');
await ukur('/store', 'Store');
await b.close();
