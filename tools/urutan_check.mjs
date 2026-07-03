// Verifikasi e2e engine 'urutan' (Urutkan + Lanjutkan Pola). Prasyarat: migrasi 0030.
// npm run build && npm start, lalu: node tools/urutan_check.mjs
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
const H = { apikey: SK, Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' };
const post = (path, body, pref) => p.evaluate(async (su, p2, b2, pr, sk, tok) => { const r = await fetch(su + '/rest/v1/' + p2, { method: 'POST', headers: { apikey: sk, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', ...(pr ? { Prefer: pr } : {}) }, body: JSON.stringify(b2) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, j }; }, SU, path, body, pref, SK, TOK);

const tema = (await post('tema', { nama: 'UrutanUji ' + stamp, sampul: '🔢', status: 'disetujui', is_minggu_ini: false }, 'return=representation')).j[0];
const urutkan = { tipe: 'urutkan', soal: [{ urut: ['1', '2', '3'], petunjuk: 'kecil → besar' }] };
const rU = await post('paket_aset', { tema_id: tema.id, mesin: 'urutan', judul: 'Urutkan ' + stamp, area_skill: 'kognitif', usia_min: 4, usia_max: 6, sumber: 'manual', status: 'disetujui', butir: urutkan }, 'return=representation');
console.log('0. INSERT urutan (CHECK 0030):', rU.status === 201 ? 'ok' : 'GAGAL ' + rU.status + ' ' + JSON.stringify(rU.j).slice(0, 140));
const urutId = Array.isArray(rU.j) ? rU.j[0]?.id : null;
const pola = { tipe: 'pola', soal: [{ tampil: ['🔴', '🔵', '🔴', '🔵'], benar: '🔴', salah: ['🔵', '🟢'] }] };
const polaId = (await post('paket_aset', { tema_id: tema.id, mesin: 'urutan', judul: 'Pola ' + stamp, area_skill: 'kognitif', usia_min: 4, usia_max: 6, sumber: 'manual', status: 'disetujui', butir: pola }, 'return=representation')).j[0]?.id;
const lahir = new Date(Date.now() - 5 * 365 * 864e5).toISOString().slice(0, 10);
const childId = (await post('anak', { nama: 'AnakUrut ' + stamp, ortu_id: UID, tanggal_lahir: lahir }, 'return=representation')).j[0]?.id;
console.log('setup:', tema?.id && urutId && polaId && childId ? 'ok' : 'GAGAL');

async function klik(teks) { const bs = await p.$$('button'); for (const bt of bs) { const t = await p.evaluate((el) => el.textContent.trim(), bt); if (t === teks) { const dis = await p.evaluate((el) => el.disabled, bt); if (!dis) { await bt.click(); return true; } } } return false; }

// MAIN urutkan: ketuk 1,2,3
await p.goto(`${U}/main/${childId}?paket=${urutId}`, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForFunction(() => document.body.innerText.includes('Ketuk berurutan'), { timeout: 20000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 400));
const u1 = await klik('1'); await new Promise((r) => setTimeout(r, 500));
const u2 = await klik('2'); await new Promise((r) => setTimeout(r, 500));
const u3 = await klik('3'); await new Promise((r) => setTimeout(r, 800));
const rw1 = await p.waitForFunction(() => document.body.innerText.includes('Hebat'), { timeout: 15000 }).then(() => true).catch(() => false);
console.log('1. MAIN Urutkan (1,2,3):', u1 && u2 && u3 ? 'ok' : 'GAGAL', '| Reward:', rw1 ? 'MUNCUL' : 'GAGAL');

// MAIN pola: jawab 🔴
await p.goto(`${U}/main/${childId}?paket=${polaId}`, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForFunction(() => document.body.innerText.includes('Lanjutkan pola'), { timeout: 20000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 400));
const pk = await klik('🔴'); await new Promise((r) => setTimeout(r, 800));
const rw2 = await p.waitForFunction(() => document.body.innerText.includes('Hebat'), { timeout: 15000 }).then(() => true).catch(() => false);
console.log('2. MAIN Pola (→🔴):', pk ? 'ok' : 'GAGAL', '| Reward:', rw2 ? 'MUNCUL' : 'GAGAL');

await new Promise((r) => setTimeout(r, 2000));
const hasil = await p.evaluate(async (su, sk, tok, cid) => (await (await fetch(`${su}/rest/v1/hasil_main?select=mesin,area_skill,bintang&anak_id=eq.${cid}`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } })).json()), SU, SK, TOK, childId);
console.log('3. hasil_main:', JSON.stringify(hasil), '| jumlah urutan:', hasil.filter((h) => h.mesin === 'urutan').length);

await p.evaluate(async (su, sk, tok, tid) => { await fetch(`${su}/rest/v1/tema?id=eq.${tid}`, { method: 'DELETE', headers: { apikey: sk, Authorization: 'Bearer ' + tok } }); }, SU, SK, TOK, tema.id);
if (childId) await p.evaluate(async (su, sk, tok, cid) => { await fetch(`${su}/rest/v1/anak?id=eq.${cid}`, { method: 'DELETE', headers: { apikey: sk, Authorization: 'Bearer ' + tok } }); }, SU, SK, TOK, childId);
console.log('4. CLEANUP: selesai');
await b.close();
