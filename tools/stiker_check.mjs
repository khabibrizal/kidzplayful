// Verifikasi e2e Stiker Nama per event. Prasyarat: migrasi 0034.
// npm run build && npm start, lalu: node tools/stiker_check.mjs
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
await p.type('input[type=email]', 'admin@kidzplayful.app'); await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]'); await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});
const { TOK, UID } = await p.evaluate(async (su, sk) => { const j = await (await fetch(su + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: sk, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kidzplayful.app', password: 'Kidz!admin2026' }) })).json(); return { TOK: j.access_token, UID: j.user.id }; }, SU, SK);
const H = { apikey: SK, Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' };
const post = (path, body, pref) => p.evaluate(async (su, p2, b2, pr, h) => { const r = await fetch(su + '/rest/v1/' + p2, { method: 'POST', headers: { ...h, ...(pr ? { Prefer: pr } : {}) }, body: JSON.stringify(b2) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, j }; }, SU, path, body, pref, H);

const ev = (await post('event', { judul: 'Stiker Uji ' + stamp, tanggal: '2026-08-01' }, 'return=representation')).j[0];
// pendaftaran 1 (diterima) + 2 (menunggu) → total 3 anak DAFTAR
await post('pendaftaran_event', { event_id: ev.id, ortu_id: UID, anak_ids: ['11111111-1111-1111-1111-111111111111'], anak_nama: ['Andi' + stamp], jumlah_anak: 1, total: 0, status: 'diterima' });
await post('pendaftaran_event', { event_id: ev.id, ortu_id: UID, anak_ids: ['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'], anak_nama: ['Budi' + stamp, 'Citra' + stamp], jumlah_anak: 2, total: 0, status: 'menunggu' });
console.log('setup event+pendaftaran:', ev?.id ? 'ok' : 'GAGAL');

await p.goto(`${U}/stiker-event/${ev.id}`, { waitUntil: 'networkidle2', timeout: 30000 });
const body = await p.evaluate(() => document.body.innerText);
const adaSemua = ['Andi' + stamp, 'Budi' + stamp, 'Citra' + stamp].every((n) => body.includes(n));
const adaJudul = body.includes('Stiker Uji ' + stamp);
const ada3 = body.includes('3 stiker');
const jmlKartu = await p.evaluate(() => document.querySelectorAll('div').length && [...document.querySelectorAll('div')].filter((d) => d.textContent && d.textContent.includes('Hai, aku')).length);
console.log('1. Halaman stiker: semua nama=', adaSemua, '| judul kelas=', adaJudul, '| "3 stiker"=', ada3, '| kartu "Hai, aku"≈', jmlKartu);

await p.evaluate(async (su, h, id) => { await fetch(`${su}/rest/v1/event?id=eq.${id}`, { method: 'DELETE', headers: h }); }, SU, H, ev.id);
console.log('2. CLEANUP: selesai');
await b.close();
