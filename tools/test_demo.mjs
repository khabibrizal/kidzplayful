import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:4505/demo.html';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const logs = [];
page.on('console', m => logs.push('CONSOLE ' + m.type() + ': ' + m.text()));
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
page.on('requestfailed', r => logs.push('REQFAIL: ' + r.url() + ' ' + (r.failure()?.errorText)));
page.on('response', r => { if (!String(r.status()).startsWith('2') && !String(r.status()).startsWith('3')) logs.push('HTTP ' + r.status() + ' <- ' + r.url()); else if (r.url().endsWith('demo.js')) logs.push('demo.js -> HTTP ' + r.status()); });

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 15000 });

const diag = await page.evaluate(() => {
  const btn = document.querySelector('#s-splash [data-go="s-menu"]');
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  const conf = document.getElementById('confetti');
  return {
    btnRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    topAtCenter: top ? (top.tagName + '.' + top.className) : 'null',
    confettiPE: getComputedStyle(conf).pointerEvents,
    confettiZ: getComputedStyle(conf).zIndex,
    splashOn: document.getElementById('s-splash').classList.contains('on')
  };
});
logs.push('DIAG ' + JSON.stringify(diag));

// klik koordinat (seperti mouse asli)
const before = await page.$eval('#s-menu', e => e.className).catch(() => 'NO #s-menu');
await page.click('#s-splash [data-go="s-menu"]').catch(e => logs.push('CLICK ERR: ' + e.message));
await new Promise(r => setTimeout(r, 300));
const after = await page.$eval('#s-menu', e => e.className).catch(() => 'NO #s-menu');
// lanjut: dari menu, klik "Main Minggu Ini" lalu mulai game
await page.click('[data-go="s-glist"]').catch(()=>{});
await new Promise(r => setTimeout(r, 250));
await page.click('[data-act="start"]').catch(()=>{});
await new Promise(r => setTimeout(r, 250));
const playOn = await page.$eval('#s-play', e => e.className).catch(() => '?');
logs.push('setelah alur ke game, #s-play = ' + JSON.stringify(playOn));

// cek apakah demo.js mengeksekusi (fungsi global tidak ada krn IIFE; cek efek DOM saja)
console.log('--- LOGS ---');
console.log(logs.join('\n') || '(tidak ada log/error)');
console.log('--- KLIK MULAI ---');
console.log('class #s-menu sebelum:', JSON.stringify(before));
console.log('class #s-menu sesudah:', JSON.stringify(after));
console.log('HASIL:', after.includes('on') ? 'KLIK BEKERJA ✓' : 'KLIK TIDAK BEKERJA ✗');

await browser.close();
