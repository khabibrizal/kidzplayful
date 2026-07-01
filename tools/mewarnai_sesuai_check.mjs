import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://www.kidzplayful.com';
const stamp = String(Date.now()).slice(-6);
const namaAnak = 'AnakSesuai ' + stamp, namaTema = 'UjiSesuai ' + stamp, judulPaket = 'Warnai Sesuai ' + stamp;

const svgPath = process.env.TEMP + '\\ujis-' + stamp + '.svg';
fs.writeFileSync(svgPath, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="8" y="20" width="36" height="60"/><circle cx="70" cy="50" r="26"/></svg>`);

const env = fs.readFileSync('.env.local', 'utf8');
const SU = (env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/) || [])[1].trim().replace(/["\r]/g, '');
const SK = (env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/) || [])[1].trim().replace(/["\r]/g, '');

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); });

await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});
const TOK = await p.evaluate(async (su, sk) => (await (await fetch(su + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: sk, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kidzplayful.app', password: 'Kidz!admin2026' }) })).json()).access_token, SU, SK);

// anak
await p.goto(U + '/pilih-anak', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const e = [...document.querySelectorAll('summary')].find((x) => x.textContent.includes('Tambah data anak')); e && e.click(); });
await p.waitForSelector('input[name=nama]', { visible: true, timeout: 10000 });
await p.type('input[name=nama]', namaAnak);
await p.select('select[name=jenis_kelamin]', 'laki-laki').catch(() => {});
await p.$eval('input[name=tanggal_lahir]', (el) => { el.value = '2022-01-01'; });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Tambah anak')); x && x.click(); });
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, namaAnak).catch(() => {});
const childId = await p.evaluate((n) => { const c = [...document.querySelectorAll('div')].find((d) => d.textContent.includes(n) && d.querySelector('a[href^="/main/"]')); const a = c && c.querySelector('a[href^="/main/"]'); return a && a.getAttribute('href').split('/main/')[1]; }, namaAnak);

// tema + approve
await p.goto(U + '/admin', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[name=sampul]', '🎯'); await p.type('input[name=nama]', namaTema);
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Buat')); x && x.click(); });
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, namaTema).catch(() => {});
await p.evaluate((n) => { const c = [...document.querySelectorAll('div')].find((d) => d.textContent.includes(n) && [...d.querySelectorAll('button')].some((x) => x.textContent.includes('Minggu Ini'))); const b = c && [...c.querySelectorAll('button')].find((x) => x.textContent.includes('Minggu Ini')); b && b.click(); }, namaTema);
await new Promise((r) => setTimeout(r, 1500));
const temaHref = await p.evaluate((n) => { const a = [...document.querySelectorAll('a[href^="/admin/tema/"]')].find((x) => x.textContent.includes(n)); return a && a.getAttribute('href'); }, namaTema);
const temaId = temaHref.split('/admin/tema/')[1];

// paket mewarnai SVG + mode sesuai + atur target (semua merah)
await p.goto(U + temaHref, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('select', { timeout: 10000 });
await (await p.$$('select'))[0].select('mewarnai');
await new Promise((r) => setTimeout(r, 400));
await (await p.$$('select'))[1].select('svg');
await new Promise((r) => setTimeout(r, 400));
await (await p.$('input[type=file]')).uploadFile(svgPath);
await p.waitForFunction(() => document.body.innerText.includes('SVG dimuat'), { timeout: 10000 }).catch(() => {});
await (await p.$$('select'))[2].select('sesuai'); // svgMode = sesuai → TargetEditor muncul
await p.waitForFunction(() => document.body.innerText.includes('area diatur'), { timeout: 10000 }).catch(() => {});
// klik semua bentuk di editor (warna default = merah) → target merah semua
for (const sh of await p.$$('svg rect, svg circle, svg path, svg ellipse, svg polygon')) { try { await sh.click(); } catch { /* */ } }
await new Promise((r) => setTimeout(r, 400));
await p.$eval('input[placeholder="Judul game"]', (el) => { el.value = ''; });
await p.type('input[placeholder="Judul game"]', judulPaket);
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Simpan paket')); x && x.click(); });
await new Promise((r) => setTimeout(r, 3000));

const info = await p.evaluate(async (su, sk, tok, tid) => {
  const r = await fetch(`${su}/rest/v1/paket_aset?select=id,butir&tema_id=eq.${tid}&mesin=eq.mewarnai`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } });
  const j = await r.json(); const row = j[0]; const bt = row?.butir || {};
  return { id: row?.id, mode: bt.mode, target: bt.target, punyaDataArea: (bt.svg || '').includes('data-area') };
}, SU, SK, TOK, temaId);
console.log('1. PAKET SVG sesuai:', info.id ? 'ok' : 'GAGAL', '| mode=' + info.mode, '| target=' + JSON.stringify(info.target), '| data-area=' + info.punyaDataArea);

// main: warnai semua merah (cocok target) → skor penuh
await p.goto(`${U}/main/${childId}?paket=${info.id}`, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('svg rect, svg circle', { timeout: 20000 });
await new Promise((r) => setTimeout(r, 600));
// warna default palet = merah (#e74c3c) → langsung klik semua bentuk di gambar utama (bukan contoh kecil)
const shapes = await p.$$('svg rect, svg circle, svg path, svg ellipse, svg polygon');
for (const sh of shapes) { try { await sh.click(); } catch { /* */ } }
await new Promise((r) => setTimeout(r, 400));
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Selesai')); x && x.click(); });
const reward = await p.waitForFunction(() => document.body.innerText.includes('Hebat'), { timeout: 20000 }).then(() => true).catch(() => false);
const skorTxt = await p.evaluate(() => { const m = document.body.innerText.match(/Benar\s+\d+\s+dari\s+\d+/); return m ? m[0] : '(tak ada)'; });
console.log('2. MAIN (warnai sesuai) → REWARD:', reward ? 'MUNCUL' : 'GAGAL', '| skor:', skorTxt);

// cleanup
await p.goto(U + '/admin', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((n) => { const c = [...document.querySelectorAll('div')].reverse().find((d) => d.textContent.includes(n) && [...d.querySelectorAll('button')].some((x) => x.textContent === 'Hapus')); const b = c && [...c.querySelectorAll('button')].find((x) => x.textContent === 'Hapus'); b && b.click(); }, namaTema);
await new Promise((r) => setTimeout(r, 1500));
if (childId) { await p.goto(U + '/anak/' + childId, { waitUntil: 'networkidle2', timeout: 30000 }); await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => /Hapus/i.test(e.textContent)); x && x.click(); }); await new Promise((r) => setTimeout(r, 1500)); }
console.log('3. CLEANUP: selesai');
await b.close();
