// Verifikasi e2e alur E-Sertifikat: absensi hadir → upload template → auto-generate → tampil di Rapor & /sertifikat/[id].
// Jalankan terhadap server LOKAL (npm start) karena fitur belum di-deploy. Supabase = prod.
//   1) npm run build && npm start   (port 3000)
//   2) node tools/sertifikat_check.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = process.env.BASE || 'http://localhost:3000';
const stamp = String(Date.now()).slice(-6);
const namaAnak = 'AnakSert ' + stamp, namaEvent = 'EventSert ' + stamp;

// template PNG 1x1 (cukup untuk uji render background)
const pngPath = process.env.TEMP + '\\tpl-' + stamp + '.png';
fs.writeFileSync(pngPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64'));

const env = fs.readFileSync('.env.local', 'utf8');
const SU = (env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/) || [])[1].trim().replace(/["\r]/g, '');
const SK = (env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/) || [])[1].trim().replace(/["\r]/g, '');
const H = (tok) => ({ apikey: SK, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' });

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); });
p.on('console', (m) => { const t = m.text(); if (/error|gagal|denied|violat|permission/i.test(t)) console.log('  [browser]', t); });
p.on('pageerror', (e) => console.log('  [pageerror]', e.message));
const bacaToast = () => p.evaluate(() => { const el = [...document.querySelectorAll('div')].find((d) => /digenerate|hadir|Gagal|tersimpan|terunggah/i.test(d.textContent) && d.style.position === 'fixed'); return el?.textContent || '(tak ada toast)'; });

// login admin (UI) + ambil token & uid via REST
await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});
const { TOK, UID } = await p.evaluate(async (su, sk) => {
  const j = await (await fetch(su + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: sk, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kidzplayful.app', password: 'Kidz!admin2026' }) })).json();
  return { TOK: j.access_token, UID: j.user.id };
}, SU, SK);

// buat anak (UI)
await p.goto(U + '/pilih-anak', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const e = [...document.querySelectorAll('summary')].find((x) => x.textContent.includes('Tambah data anak')); e && e.click(); });
await p.waitForSelector('input[name=nama]', { visible: true, timeout: 10000 });
await p.type('input[name=nama]', namaAnak);
await p.select('select[name=jenis_kelamin]', 'laki-laki').catch(() => {});
await p.$eval('input[name=tanggal_lahir]', (el) => { el.value = '2022-01-01'; });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Tambah anak')); x && x.click(); });
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, namaAnak).catch(() => {});
const childId = await p.evaluate((n) => { const c = [...document.querySelectorAll('div')].find((d) => d.textContent.includes(n) && d.querySelector('a[href^="/main/"]')); const a = c && c.querySelector('a[href^="/main/"]'); return a && a.getAttribute('href').split('/main/')[1]; }, namaAnak);
console.log('anak:', childId ? 'ok ' + childId : 'GAGAL');

// buat event (UI)
await p.goto(U + '/admin/event', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Tambah Event')); x && x.click(); });
await p.waitForSelector('input[placeholder="Judul event"]', { visible: true, timeout: 10000 });
await p.type('input[placeholder="Judul event"]', namaEvent);
await p.type('input[placeholder="Lokasi event"]', 'Aula KidzPlayful');
await p.$eval('input[type=date]', (el) => { el.value = '2026-07-10'; el.dispatchEvent(new Event('input', { bubbles: true })); });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Simpan')); x && x.click(); });
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, namaEvent).catch(() => {});
const eventId = await p.evaluate(async (su, sk, tok, judul) => {
  const j = await (await fetch(`${su}/rest/v1/event?select=id&judul=eq.${encodeURIComponent(judul)}`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } })).json();
  return j[0]?.id;
}, SU, SK, TOK, namaEvent);
console.log('event:', eventId ? 'ok ' + eventId : 'GAGAL');

// pendaftaran (REST insert sebagai ortu=admin) → Terima + Hadir (REST admin update)
const pendId = await p.evaluate(async (su, sk, tok, uid, ev, cid, nm) => {
  const r = await fetch(`${su}/rest/v1/pendaftaran_event`, { method: 'POST', headers: { apikey: sk, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ event_id: ev, ortu_id: uid, anak_ids: [cid], anak_nama: [nm], jumlah_anak: 1, total: 0, status: 'diterima', hadir_anak_ids: [cid] }) });
  const j = await r.json(); return Array.isArray(j) ? j[0]?.id : j?.id;
}, SU, SK, TOK, UID, eventId, childId, namaAnak);
console.log('pendaftaran (diterima + hadir):', pendId ? 'ok' : 'GAGAL');

// upload template (UI) di kartu event → auto-generate
await p.goto(U + '/admin/event', { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 15000 }, namaEvent);
const inputHandle = await p.evaluateHandle((judul) => {
  const cards = [...document.querySelectorAll('div')].filter((d) => d.querySelector(':scope > details') && d.textContent.includes(judul));
  cards.sort((a, b) => a.textContent.length - b.textContent.length); // kartu paling spesifik
  const card = cards[0];
  return card ? card.querySelector('input[type=file]') : null;
}, namaEvent);
const fileEl = inputHandle.asElement();
if (!fileEl) { console.log('template input: GAGAL ditemukan'); } else { await fileEl.uploadFile(pngPath); }
await new Promise((r) => setTimeout(r, 1500));
console.log('   toast setelah upload:', await bacaToast());

// tunggu sertifikat muncul di DB
let sert = null;
for (let i = 0; i < 20 && !sert; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  sert = await p.evaluate(async (su, sk, tok, cid) => {
    const j = await (await fetch(`${su}/rest/v1/sertifikat?select=id,anak_nama,event_judul,bg_url,dokumentasi_url&anak_id=eq.${cid}`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } })).json();
    return j[0] || null;
  }, SU, SK, TOK, childId);
}
console.log('1. GENERATE sertifikat:', sert ? 'ok id=' + sert.id + ' | bg=' + !!sert.bg_url : 'GAGAL');

// simpan link dokumentasi lewat PANEL asli (input "Link dokumentasi" → "Simpan link") → auto-generate
await p.evaluate((judul) => {
  const cards = [...document.querySelectorAll('div')].filter((d) => d.querySelector(':scope > details') && d.textContent.includes(judul));
  cards.sort((a, b) => a.textContent.length - b.textContent.length);
  const card = cards[0];
  const inp = card && card.querySelector('input[placeholder^="Link dokumentasi"]');
  if (inp) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, 'https://example.com/album');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const btn = card && [...card.querySelectorAll('button')].find((x) => x.textContent.includes('Simpan link'));
  btn && btn.click();
}, namaEvent);
let doc = null;
for (let i = 0; i < 15 && !doc; i++) { await new Promise((r) => setTimeout(r, 1000)); doc = await p.evaluate(async (su, sk, tok, cid) => { const j = await (await fetch(`${su}/rest/v1/sertifikat?select=dokumentasi_url&anak_id=eq.${cid}`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } })).json(); return j[0]?.dokumentasi_url || null; }, SU, SK, TOK, childId); }
console.log('2. LINK DOKUMENTASI ter-snapshot:', doc === 'https://example.com/album' ? 'ok' : 'GAGAL (' + doc + ')');

// Rapor anak menampilkan section + /sertifikat/[id] menampilkan nama
await p.goto(`${U}/anak/${childId}/laporan`, { waitUntil: 'networkidle2', timeout: 30000 });
const diRapor = await p.evaluate((j) => document.body.innerText.includes('SERTIFIKAT') && document.body.innerText.includes(j), namaEvent);
console.log('3. RAPOR anak tampil sertifikat:', diRapor ? 'ok' : 'GAGAL');
if (sert) {
  await p.goto(`${U}/sertifikat/${sert.id}`, { waitUntil: 'networkidle2', timeout: 30000 });
  const view = await p.evaluate((n) => document.body.innerText.includes(n), namaAnak);
  const adaImg = await p.evaluate(() => !!document.querySelector('img[alt="Template sertifikat"]'));
  console.log('4. HALAMAN /sertifikat: nama tampil=', view, '| background img=', adaImg);
}

// cleanup: hapus event (REST) + anak (UI) → sertifikat ikut terhapus via cascade anak
await p.evaluate(async (su, sk, tok, ev) => { await fetch(`${su}/rest/v1/event?id=eq.${ev}`, { method: 'DELETE', headers: { apikey: sk, Authorization: 'Bearer ' + tok } }); }, SU, SK, TOK, eventId);
if (childId) { await p.goto(U + '/anak/' + childId, { waitUntil: 'networkidle2', timeout: 30000 }); await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => /Hapus/i.test(e.textContent)); x && x.click(); }); await new Promise((r) => setTimeout(r, 1500)); }
const sisa = await p.evaluate(async (su, sk, tok, cid) => { const j = await (await fetch(`${su}/rest/v1/sertifikat?select=id&anak_id=eq.${cid}`, { headers: { apikey: sk, Authorization: 'Bearer ' + tok } })).json(); return j.length; }, SU, SK, TOK, childId);
console.log('5. CLEANUP: sisa sertifikat =', sisa, sisa === 0 ? '(bersih)' : '(cek manual)');
await b.close();
