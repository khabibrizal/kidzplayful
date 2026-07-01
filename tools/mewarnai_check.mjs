import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://www.kidzplayful.com';
const stamp = String(Date.now()).slice(-6);
const namaAnak = 'AnakWarna ' + stamp;
const namaTema = 'UjiWarna ' + stamp;
const judulPaket = 'Mewarnai Apel ' + stamp;

// kredensial supabase utk ambil paketId
const env = fs.readFileSync('.env.local', 'utf8');
const SU = (env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/) || [])[1].trim().replace(/["\r]/g, '');
const SK = (env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/) || [])[1].trim().replace(/["\r]/g, '');

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); });
const clickText = (t) => p.evaluate((x) => { const el = [...document.querySelectorAll('button,a,summary')].find((e) => e.textContent.trim().includes(x)); el && el.click(); }, t);

// login
await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});
const TOK = await p.evaluate(async (su, sk) => {
  const r = await fetch(su + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: sk, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kidzplayful.app', password: 'Kidz!admin2026' }) });
  return (await r.json()).access_token;
}, SU, SK);

// 0) buat anak (buka collapse dulu)
await p.goto(U + '/pilih-anak', { waitUntil: 'networkidle2', timeout: 30000 });
await clickText('Tambah data anak');
await p.waitForSelector('input[name=nama]', { timeout: 10000, visible: true });
await p.type('input[name=nama]', namaAnak);
await p.select('select[name=jenis_kelamin]', 'laki-laki').catch(() => {});
await p.$eval('input[name=tanggal_lahir]', (el) => { el.value = '2022-01-01'; });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Tambah anak')); x && x.click(); });
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, namaAnak).catch(() => {});
const childHref = await p.evaluate((n) => { const c = [...document.querySelectorAll('div')].find((d) => d.textContent.includes(n) && d.querySelector('a[href^="/main/"]')); const a = c && c.querySelector('a[href^="/main/"]'); return a && a.getAttribute('href'); }, namaAnak);
const childId = childHref ? childHref.split('/main/')[1] : null;
console.log('0. ANAK:', namaAnak, childId ? 'ok' : 'GAGAL');

// 1) buat tema + approve (jadikan minggu ini)
await p.goto(U + '/admin', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[name=sampul]', '🎨');
await p.type('input[name=nama]', namaTema);
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Buat')); x && x.click(); });
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, namaTema).catch(() => {});
await p.evaluate((n) => { const c = [...document.querySelectorAll('div')].find((d) => d.textContent.includes(n) && [...d.querySelectorAll('button')].some((x) => x.textContent.includes('Minggu Ini'))); const b = c && [...c.querySelectorAll('button')].find((x) => x.textContent.includes('Minggu Ini')); b && b.click(); }, namaTema);
await new Promise((r) => setTimeout(r, 1500));
const temaHref = await p.evaluate((n) => { const a = [...document.querySelectorAll('a[href^="/admin/tema/"]')].find((x) => x.textContent.includes(n)); return a && a.getAttribute('href'); }, namaTema);
const temaId = temaHref ? temaHref.split('/admin/tema/')[1] : null;
console.log('1. TEMA:', namaTema, temaId ? '(approved)' : 'GAGAL');

// 2) tambah paket mewarnai
await p.goto(U + temaHref, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('select', { timeout: 10000 });
await (await p.$$('select'))[0].select('mewarnai');
await new Promise((r) => setTimeout(r, 400));
await p.$eval('input[placeholder="Judul game"]', (el) => { el.value = ''; });
await p.type('input[placeholder="Judul game"]', judulPaket);
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Simpan paket')); x && x.click(); });
await new Promise((r) => setTimeout(r, 3000));
const paketErr = await p.evaluate(() => { const e = [...document.querySelectorAll('div')].find((d) => d.style && d.textContent.includes('constraint') || (d.textContent || '').includes('Gagal')); return e ? e.textContent.slice(0, 80) : ''; });
// ambil paketId via REST
const paketId = await p.evaluate(async (su, sk, tok, tid) => {
  const r = await fetch(`${su}/rest/v1/paket_aset?select=id&tema_id=eq.${tid}&mesin=eq.mewarnai`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } });
  const j = await r.json(); return Array.isArray(j) && j[0] ? j[0].id : null;
}, SU, SK, TOK, temaId);
console.log('2. PAKET mewarnai:', paketId ? 'ok ' + paketId.slice(0, 8) : 'GAGAL ' + paketErr);

// 3) mainkan via deep-link
await p.goto(`${U}/main/${childId}?paket=${paketId}`, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('svg path, svg ellipse, svg rect', { timeout: 20000 });
await new Promise((r) => setTimeout(r, 800));
const shapes = await p.$$('svg path, svg rect, svg circle, svg ellipse, svg polygon');
console.log('3. GAME: ditemukan', shapes.length, 'bentuk, mewarnai...');
for (const sh of shapes) { try { await sh.click(); } catch { /* skip */ } }
await new Promise((r) => setTimeout(r, 500));
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Selesai')); x && x.click(); });
const reward = await p.waitForFunction(() => document.body.innerText.includes('Hebat'), { timeout: 20000 }).then(() => true).catch(() => false);
console.log('4. SELESAI → REWARD:', reward ? 'MUNCUL ⭐' : 'GAGAL');

// 5) cleanup: hapus tema (cascade paket) + anak
await p.goto(U + '/admin', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((n) => { const c = [...document.querySelectorAll('div')].reverse().find((d) => d.textContent.includes(n) && [...d.querySelectorAll('button')].some((x) => x.textContent === 'Hapus')); const b = c && [...c.querySelectorAll('button')].find((x) => x.textContent === 'Hapus'); b && b.click(); }, namaTema);
await new Promise((r) => setTimeout(r, 1500));
if (childId) { await p.goto(U + '/anak/' + childId, { waitUntil: 'networkidle2', timeout: 30000 }); await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => /Hapus/i.test(e.textContent)); x && x.click(); }); await new Promise((r) => setTimeout(r, 1500)); }
console.log('5. CLEANUP: tema + anak dihapus');

await b.close();
