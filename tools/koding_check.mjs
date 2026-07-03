// Verifikasi e2e engine game koding Fase 1: Dekode + Mewarnai-berkode.
// Jalankan terhadap server LOKAL (npm build+start) karena belum deploy. Supabase = prod.
// PRASYARAT: migrasi 0029 (CHECK 'dekode') sudah dijalankan.
//   1) npm run build && npm start
//   2) node tools/koding_check.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const U = process.env.BASE || 'http://localhost:3000';
const stamp = String(Date.now()).slice(-6);
const env = fs.readFileSync('.env.local', 'utf8');
const SU = (env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/) || [])[1].trim().replace(/["\r]/g, '');
const SK = (env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/) || [])[1].trim().replace(/["\r]/g, '');
const H = (tok) => ({ apikey: SK, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' });

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); });

// login admin + token/uid
await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});
const { TOK, UID } = await p.evaluate(async (su, sk) => {
  const j = await (await fetch(su + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: sk, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kidzplayful.app', password: 'Kidz!admin2026' }) })).json();
  return { TOK: j.access_token, UID: j.user.id };
}, SU, SK);

const post = (path, body, tok, pref) => p.evaluate(async (su, p2, b2, t2, pr, sk) => {
  const r = await fetch(su + '/rest/v1/' + p2, { method: 'POST', headers: { apikey: sk, Authorization: 'Bearer ' + t2, 'Content-Type': 'application/json', ...(pr ? { Prefer: pr } : {}) }, body: JSON.stringify(b2) });
  const txt = await r.text(); let j; try { j = JSON.parse(txt); } catch { j = txt; }
  return { status: r.status, j };
}, SU, path, body, tok, pref, SK);

// tema "Koding Seru"
const tema = (await post('tema', { nama: 'Koding Seru ' + stamp, sampul: '🧩', status: 'disetujui', is_minggu_ini: false }, TOK, 'return=representation')).j[0];
console.log('tema:', tema?.id ? 'ok' : 'GAGAL');

// paket DEKODE (uji CHECK 0029) — warna→huruf, 1 soal [merah, biru] = A B
const dekBody = { tema_id: tema.id, mesin: 'dekode', judul: 'Pecahkan Kode ' + stamp, area_skill: 'kognitif', usia_min: 4, usia_max: 6, sumber: 'manual', status: 'disetujui', butir: { legenda: [{ simbol: '#e74c3c', nilai: 'A' }, { simbol: '#3498db', nilai: 'B' }], soal: [['#e74c3c', '#3498db']] } };
const dekRes = await post('paket_aset', dekBody, TOK, 'return=representation');
console.log('0. INSERT dekode (CHECK 0029):', dekRes.status === 201 ? 'ok' : 'GAGAL ' + dekRes.status + ' ' + JSON.stringify(dekRes.j).slice(0, 160));
const dekId = Array.isArray(dekRes.j) ? dekRes.j[0]?.id : null;

// paket MEWARNAI-BERKODE — 2 area, target merah(1)/biru(2)
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect data-area="0" x="5" y="5" width="40" height="90"/><rect data-area="1" x="55" y="5" width="40" height="90"/></svg>';
const mewBody = { tema_id: tema.id, mesin: 'mewarnai', judul: 'Warnai Berkode ' + stamp, area_skill: 'kreativitas', usia_min: 4, usia_max: 6, sumber: 'manual', status: 'disetujui', butir: { sumber: 'svg', svg, palette: ['#e74c3c', '#3498db', '#2ecc71'], mode: 'berkode', target: { '0': '#e74c3c', '1': '#3498db' } } };
const mewId = (await post('paket_aset', mewBody, TOK, 'return=representation')).j[0]?.id;
console.log('paket mewarnai-berkode:', mewId ? 'ok' : 'GAGAL');

// anak usia 5
const lahir = new Date(Date.now() - 5 * 365 * 864e5).toISOString().slice(0, 10);
const anak = (await post('anak', { nama: 'AnakKoding ' + stamp, ortu_id: UID, tanggal_lahir: lahir }, TOK, 'return=representation')).j[0];
const childId = anak?.id;
console.log('anak usia 5:', childId ? 'ok' : 'GAGAL');

async function klikTeksBtn(teks) {
  const btns = await p.$$('button');
  for (const bt of btns) { const t = await p.evaluate((el) => el.textContent.trim(), bt); if (t === teks) { await bt.click(); return true; } }
  return false;
}

// MAIN Dekode: jawab A lalu B
if (dekId && childId) {
  await p.goto(`${U}/main/${childId}?paket=${dekId}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await p.waitForFunction(() => document.body.innerText.includes('Soal'), { timeout: 20000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));
  const a1 = await klikTeksBtn('A'); await new Promise((r) => setTimeout(r, 900));
  const a2 = await klikTeksBtn('B'); await new Promise((r) => setTimeout(r, 900));
  const reward = await p.waitForFunction(() => document.body.innerText.includes('Hebat'), { timeout: 15000 }).then(() => true).catch(() => false);
  const skor = await p.evaluate(() => { const m = document.body.innerText.match(/Benar\s+\d+\s+dari\s+\d+/); return m ? m[0] : '(?)'; });
  console.log('1. MAIN Dekode → tap A/B:', a1 && a2 ? 'ok' : 'GAGAL', '| Reward:', reward ? 'MUNCUL' : 'GAGAL', '|', skor);
}

// MAIN Mewarnai-berkode: cek label angka, lalu warnai sesuai
if (mewId && childId) {
  await p.goto(`${U}/main/${childId}?paket=${mewId}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await p.waitForSelector('svg rect', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 500));
  const labelAngka = await p.evaluate(() => document.querySelectorAll('svg text').length);
  // palet: tombol swatch pertama=merah(1), kedua=biru(2). Warnai area0=merah, area1=biru.
  const swatches = await p.$$('div > button[aria-label]');
  const rects = await p.$$('svg rect');
  try {
    // cari swatch dgn aria-label mengandung 'Warna 1'/'Warna 2'
    const sw = await p.$$('button[aria-label^="Warna"]');
    if (sw[0] && rects[0]) { await sw[0].click(); await rects[0].click(); }
    if (sw[1] && rects[1]) { await sw[1].click(); await rects[1].click(); }
  } catch { /* */ }
  await new Promise((r) => setTimeout(r, 300));
  await klikTeksBtn('Selesai ✓').catch(() => {});
  const reward2 = await p.waitForFunction(() => document.body.innerText.includes('Hebat'), { timeout: 15000 }).then(() => true).catch(() => false);
  const skor2 = await p.evaluate(() => { const m = document.body.innerText.match(/Benar\s+\d+\s+dari\s+\d+/); return m ? m[0] : '(?)'; });
  console.log('2. MAIN Mewarnai-berkode → label angka:', labelAngka, '| Reward:', reward2 ? 'MUNCUL' : 'GAGAL', '|', skor2, '| swatch found:', swatches.length);
}

// verifikasi hasil_main tercatat (beri jeda agar catatHasil async selesai)
await new Promise((r) => setTimeout(r, 2000));
const hasil = await p.evaluate(async (su, sk, tok, cid) => {
  const j = await (await fetch(`${su}/rest/v1/hasil_main?select=mesin,area_skill,bintang&anak_id=eq.${cid}`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } })).json();
  return j;
}, SU, SK, TOK, childId);
const adaDek = hasil.some((h) => h.mesin === 'dekode');
const adaMew = hasil.some((h) => h.mesin === 'mewarnai');
console.log('3. hasil_main:', JSON.stringify(hasil), '| dekode:', adaDek, '| mewarnai:', adaMew);

// cleanup
await p.evaluate(async (su, sk, tok, tid) => { await fetch(`${su}/rest/v1/tema?id=eq.${tid}`, { method: 'DELETE', headers: { apikey: sk, Authorization: 'Bearer ' + tok } }); }, SU, SK, TOK, tema.id);
if (childId) await p.evaluate(async (su, sk, tok, cid) => { await fetch(`${su}/rest/v1/anak?id=eq.${cid}`, { method: 'DELETE', headers: { apikey: sk, Authorization: 'Bearer ' + tok } }); }, SU, SK, TOK, childId);
console.log('4. CLEANUP: selesai');
await b.close();
