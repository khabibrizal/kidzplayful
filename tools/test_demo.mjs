import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:4505/demo.html';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const cls = id => page.$eval('#' + id, e => e.className).catch(() => '?');
const sleep = ms => new Promise(r => setTimeout(r, ms));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 15000 });

// Mana Ya?
await page.click('[data-go="s-menu"]'); await sleep(200);
await page.click('[data-go="s-glist"]'); await sleep(200);
await page.click('[data-act="start"]'); await sleep(200);
console.log('Mana Ya? -> #s-play =', JSON.stringify(await cls('s-play')));

// Beres-Beres
await page.click('#s-play [data-go="s-glist"]'); await sleep(150);
await page.click('[data-act="start2"]'); await sleep(200);
const sortItems = await page.$$eval('#sortarea .item', els => els.length);
console.log('Beres-Beres -> #s-play2 =', JSON.stringify(await cls('s-play2')), '| item:', sortItems);

// Cari Pasangan + selesaikan
await page.click('#s-play2 [data-go="s-glist"]'); await sleep(150);
await page.click('[data-act="start3"]'); await sleep(200);
console.log('Cari Pasangan -> #s-play3 =', JSON.stringify(await cls('s-play3')));

// auto-play: kelompokkan kartu sama, klik berpasangan
const cards = await page.$$('#matchgrid .card');
const texts = await Promise.all(cards.map(c => c.evaluate(e => e.textContent)));
const byKey = {};
texts.forEach((t, i) => { (byKey[t] = byKey[t] || []).push(i); });
for (const k in byKey) {
  for (const idx of byKey[k]) { await cards[idx].click(); await sleep(180); }
}
await sleep(700);
console.log('Setelah selesaikan match -> #s-reward =', JSON.stringify(await cls('s-reward')));

console.log('ERRORS:', errs.length ? errs.join('\n') : 'tidak ada');
await browser.close();
