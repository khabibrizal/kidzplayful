// Verifikasi e2e engine 'hitung' (Hitung-Kode). Prasyarat: migrasi 0032.
// npm run build && npm start, lalu: node tools/hitung_check.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const U = process.env.BASE || 'http://localhost:3000';
const stamp = String(Date.now()).slice(-6);
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
const { TOK, UID } = await p.evaluate(async (su, sk) => { const j = await (await fetch(su + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: sk, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kidzplayful.app', password: 'Kidz!admin2026' }) })).json(); return { TOK: j.access_token, UID: j.user.id }; }, SU, SK);
const post = (path, body, pref) => p.evaluate(async (su, p2, b2, pr, sk, tok) => { const r = await fetch(su + '/rest/v1/' + p2, { method: 'POST', headers: { apikey: sk, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', ...(pr ? { Prefer: pr } : {}) }, body: JSON.stringify(b2) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, j }; }, SU, path, body, pref, SK, TOK);

const tema = (await post('tema', { nama: 'HitungUji ' + stamp, sampul: '➕', status: 'disetujui', is_minggu_ini: false }, 'return=representation')).j[0];
// 🍎=3, 🍌=2 ; soal 🍎+🍌=5 dan 🍎-🍌=1
const butir = { legenda: [{ simbol: '🍎', nilai: 3 }, { simbol: '🍌', nilai: 2 }], soal: [{ kiri: '🍎', kanan: '🍌', operasi: '+' }, { kiri: '🍎', kanan: '🍌', operasi: '-' }] };
const rH = await post('paket_aset', { tema_id: tema.id, mesin: 'hitung', judul: 'Hitung Buah ' + stamp, area_skill: 'kognitif', usia_min: 4, usia_max: 6, sumber: 'manual', status: 'disetujui', butir }, 'return=representation');
console.log('0. INSERT hitung (CHECK 0032):', rH.status === 201 ? 'ok' : 'GAGAL ' + rH.status + ' ' + JSON.stringify(rH.j).slice(0, 140));
const hitungId = Array.isArray(rH.j) ? rH.j[0]?.id : null;
const lahir = new Date(Date.now() - 5 * 365 * 864e5).toISOString().slice(0, 10);
const childId = (await post('anak', { nama: 'AnakHitung ' + stamp, ortu_id: UID, tanggal_lahir: lahir }, 'return=representation')).j[0]?.id;
console.log('setup:', tema?.id && hitungId && childId ? 'ok' : 'GAGAL');

async function klik(teks) { const bs = await p.$$('button'); for (const bt of bs) { const t = await p.evaluate((el) => el.textContent.trim(), bt); if (t === teks) { await bt.click(); return true; } } return false; }

await p.goto(`${U}/main/${childId}?paket=${hitungId}`, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('button', { timeout: 20000 });
await new Promise((r) => setTimeout(r, 500));
const a1 = await klik('5'); await new Promise((r) => setTimeout(r, 900)); // 🍎+🍌=5
const a2 = await klik('1'); await new Promise((r) => setTimeout(r, 900)); // 🍎-🍌=1
const reward = await p.waitForFunction(() => document.body.innerText.includes('Hebat'), { timeout: 15000 }).then(() => true).catch(() => false);
const skor = await p.evaluate(() => { const m = document.body.innerText.match(/Benar\s+\d+\s+dari\s+\d+/); return m ? m[0] : '(?)'; });
console.log('1. MAIN Hitung (5, 1):', a1 && a2 ? 'ok' : 'GAGAL', '| Reward:', reward ? 'MUNCUL' : 'GAGAL', '|', skor);

await new Promise((r) => setTimeout(r, 2000));
const hasil = await p.evaluate(async (su, sk, tok, cid) => (await (await fetch(`${su}/rest/v1/hasil_main?select=mesin,bintang&anak_id=eq.${cid}`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } })).json()), SU, SK, TOK, childId);
console.log('2. hasil_main:', JSON.stringify(hasil), '| hitung:', hasil.some((h) => h.mesin === 'hitung'));

await p.evaluate(async (su, sk, tok, tid) => { await fetch(`${su}/rest/v1/tema?id=eq.${tid}`, { method: 'DELETE', headers: { apikey: sk, Authorization: 'Bearer ' + tok } }); }, SU, SK, TOK, tema.id);
if (childId) await p.evaluate(async (su, sk, tok, cid) => { await fetch(`${su}/rest/v1/anak?id=eq.${cid}`, { method: 'DELETE', headers: { apikey: sk, Authorization: 'Bearer ' + tok } }); }, SU, SK, TOK, childId);
console.log('3. CLEANUP: selesai');
await b.close();
