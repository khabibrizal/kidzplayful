// Verifikasi alur ADMIN FORM membuat paket 'dekode' (buatPaket server action), bukan REST.
// Prasyarat: migrasi 0029. Jalankan: npm run build && npm start, lalu node tools/koding_form_check.mjs
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
const TOK = await p.evaluate(async (su, sk) => (await (await fetch(su + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: sk, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kidzplayful.app', password: 'Kidz!admin2026' }) })).json()).access_token, SU, SK);
const H = { apikey: SK, Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' };

const tema = (await p.evaluate(async (su, h, nm) => (await (await fetch(su + '/rest/v1/tema', { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify({ nama: nm, sampul: '🧩', status: 'disetujui', is_minggu_ini: false }) })).json())[0], SU, H, 'FormUji ' + stamp));
console.log('tema:', tema?.id ? 'ok' : 'GAGAL');

await p.goto(`${U}/admin/tema/${tema.id}`, { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('select', { timeout: 15000 });
await p.select('select', 'dekode');                 // select mesin pertama
await new Promise((r) => setTimeout(r, 400));

// judul
await p.$eval('input[placeholder="Judul game"]', (el) => { el.value = ''; });
await p.type('input[placeholder="Judul game"]', 'Kode Warna ' + stamp);

// usia 4-6 (2 input number pertama di form)
const nums = await p.$$('input[type=number]');
if (nums[0]) { await nums[0].click({ clickCount: 3 }); await nums[0].type('4'); }
if (nums[1]) { await nums[1].click({ clickCount: 3 }); await nums[1].type('6'); }

async function isiSimbolNilai(idx, simbol, nilai) {
  const sim = await p.$$('input[placeholder^="🔴"]');
  const nil = await p.$$('input[placeholder="nilai (A / 1 / kata)"]');
  if (sim[idx]) { await sim[idx].click({ clickCount: 3 }); await sim[idx].type(simbol); }
  if (nil[idx]) { await nil[idx].click({ clickCount: 3 }); await nil[idx].type(nilai); }
}
// legenda row 0 (sudah ada) → 🔴=A ; tambah row 1 → 🔵=B
await isiSimbolNilai(0, '🔴', 'A');
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === '+ legenda'); x && x.click(); });
await new Promise((r) => setTimeout(r, 300));
await isiSimbolNilai(1, '🔵', 'B');

// susun soal 1: klik tombol simbol 🔴 lalu 🔵 (append) di dalam kartu soal
async function klikAppend(emoji) {
  const btns = await p.$$('button');
  for (const bt of btns) { const t = await p.evaluate((el) => el.textContent.trim(), bt); if (t === emoji) { await bt.click(); return true; } }
  return false;
}
const s1 = await klikAppend('🔴'); await new Promise((r) => setTimeout(r, 200));
const s2 = await klikAppend('🔵'); await new Promise((r) => setTimeout(r, 200));
console.log('append simbol ke soal:', s1 && s2 ? 'ok' : 'GAGAL');

// simpan
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Simpan paket')); x && x.click(); });
await new Promise((r) => setTimeout(r, 3500));
const errText = await p.evaluate(() => { const el = [...document.querySelectorAll('div')].find((d) => d.style.color === 'rgb(192, 57, 43)'); return el ? el.textContent : ''; });

// verifikasi via REST
const paket = await p.evaluate(async (su, h, tid) => (await (await fetch(`${su}/rest/v1/paket_aset?select=mesin,usia_min,usia_max,butir&tema_id=eq.${tid}`, { headers: h })).json()), SU, H, tema.id);
const row = paket[0];
const okLeg = row?.butir?.legenda?.length === 2;
const okSoal = row?.butir?.soal?.length === 1 && row?.butir?.soal?.[0]?.length === 2;
console.log('SIMPAN dekode via form:', row?.mesin === 'dekode' ? 'ok' : 'GAGAL', '| usia', row?.usia_min + '-' + row?.usia_max, '| legenda2:', okLeg, '| soal[2]:', okSoal, '| err:', errText || '(none)');

// cleanup
await p.evaluate(async (su, h, tid) => { await fetch(`${su}/rest/v1/tema?id=eq.${tid}`, { method: 'DELETE', headers: h }); }, SU, H, tema.id);
console.log('cleanup: selesai');
await b.close();
