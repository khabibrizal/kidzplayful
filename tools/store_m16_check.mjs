import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const U = 'https://kidzplayful-fe2a.vercel.app';
const stamp = String(Date.now()).slice(-6);
const nama = 'Produk Uji ' + stamp;
const STOK0 = 5;

// siapkan file bukti (1x1 png)
const buktiPath = process.env.TEMP + '\\bukti-' + stamp + '.png';
writeFileSync(buktiPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('dialog', async (d) => { await d.accept(); });

// helper: set value input React-controlled
const setReact = (sel, val, root) => {
  const inp = (root || document).querySelector(sel);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, String(val));
  inp.dispatchEvent(new Event('input', { bubbles: true }));
};

await p.goto(U + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
await p.type('input[type=email]', 'admin@kidzplayful.app');
await p.type('input[type=password]', 'Kidz!admin2026');
await p.click('button[type=submit]');
await p.waitForFunction(() => location.pathname.startsWith('/pilih-anak'), { timeout: 30000 }).catch(() => {});

// 1) admin buat produk
await p.goto(U + '/admin/produk', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Tambah Produk')); x && x.click(); });
await p.waitForSelector('input[placeholder="Nama produk"]', { timeout: 15000 });
await p.type('input[placeholder="Nama produk"]', nama);
await p.type('input[placeholder^="Kategori"]', 'Mainan');
await p.type('input[placeholder="Harga (Rp)"]', '50000');
await p.type('input[placeholder="Stok"]', String(STOK0));
await p.type('textarea[placeholder="Keterangan produk"]', 'Produk uji otomatis');
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Simpan')); x && x.click(); });
const ok1 = await p.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, nama).then(() => true).catch(() => false);
console.log('1. BUAT PRODUK:', ok1 ? 'BERHASIL' : 'GAGAL');

// 2) tambah ke keranjang dari /store
await p.goto(U + '/store', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((n) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes(n) && [...d.querySelectorAll('button')].some(b => b.textContent.includes('Keranjang')));
  const btn = card && [...card.querySelectorAll('button')].find(b => b.textContent.includes('Keranjang'));
  btn && btn.click();
}, nama);
await new Promise(r => setTimeout(r, 1500));

// 3) checkout
await p.goto(U + '/keranjang', { waitUntil: 'networkidle2', timeout: 30000 });
await p.waitForSelector('input[placeholder="Nama penerima"]', { timeout: 15000 });
await p.type('input[placeholder="Nama penerima"]', 'Kak Uji');
await p.type('input[placeholder="No. HP / WhatsApp"]', '081234567890');
await p.type('textarea[placeholder^="Alamat"]', 'Jl. Contoh No. 1, Sidoarjo');
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Buat Pesanan')); x && x.click(); });
await p.waitForFunction(() => /\/pesanan\/[0-9a-f-]+/.test(location.pathname), { timeout: 20000 }).catch(() => {});
const orderUrl = p.url();
const oid = orderUrl.split('/pesanan/')[1];
const sid = oid ? oid.slice(0, 8) : '';
console.log('2-3. CHECKOUT → pesanan', sid, oid ? 'BERHASIL' : 'GAGAL');

// 4) admin set ongkir
await p.goto(U + '/admin/pesanan', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((sid_, setReactStr) => {
  const setReactFn = eval('(' + setReactStr + ')');
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes('#' + sid_) && [...d.querySelectorAll('button')].some(b => b.textContent.includes('Set ongkir')));
  setReactFn('input[type=number]', 15000, card);
  [...card.querySelectorAll('button')].find(b => b.textContent.includes('Set ongkir')).click();
}, sid, setReact.toString());
const ok4 = await p.waitForFunction((sid_) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes('#' + sid_));
  return card && card.textContent.includes('Menunggu pembayaran');
}, { timeout: 15000 }, sid).then(() => true).catch(() => false);
console.log('4. SET ONGKIR (admin):', ok4 ? 'BERHASIL (menunggu pembayaran)' : 'GAGAL');

// 5) user upload bukti
await p.goto(orderUrl, { waitUntil: 'networkidle2', timeout: 30000 });
const fileInput = await p.$('input[type=file]');
if (fileInput) await fileInput.uploadFile(buktiPath);
const ok5 = await p.waitForFunction(() => document.body.innerText.includes('Menunggu verifikasi'), { timeout: 25000 }).then(() => true).catch(() => false);
console.log('5. UPLOAD BUKTI (user):', ok5 ? 'BERHASIL (menunggu verifikasi)' : 'GAGAL');

// 6) admin verifikasi
await p.goto(U + '/admin/pesanan', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((sid_) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes('#' + sid_) && [...d.querySelectorAll('button')].some(b => b.textContent.includes('Verifikasi')));
  [...card.querySelectorAll('button')].find(b => b.textContent.includes('Verifikasi')).click();
}, sid);
const ok6 = await p.waitForFunction((sid_) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes('#' + sid_));
  return card && card.textContent.includes('Diproses');
}, { timeout: 15000 }, sid).then(() => true).catch(() => false);
console.log('6. VERIFIKASI (admin):', ok6 ? 'BERHASIL (diproses)' : 'GAGAL');

// 7) cek stok berkurang
await p.goto(U + '/admin/produk', { waitUntil: 'networkidle2', timeout: 30000 });
const stokTxt = await p.evaluate((n) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes(n) && d.textContent.includes('stok'));
  return card ? (card.innerText.match(/stok\s+(\d+)/) || [])[1] : null;
}, nama);
console.log('7. STOK setelah verifikasi:', stokTxt, '(harusnya', STOK0 - 1, ')');

// 8) admin set resi → kirim
await p.goto(U + '/admin/pesanan', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((sid_, setReactStr) => {
  const setReactFn = eval('(' + setReactStr + ')');
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes('#' + sid_) && [...d.querySelectorAll('button')].some(b => b.textContent.trim() === 'Kirim'));
  setReactFn('input[type=text], input:not([type])', 'JNE123456', card);
  [...card.querySelectorAll('button')].find(b => b.textContent.trim() === 'Kirim').click();
}, sid, setReact.toString());
const ok8 = await p.waitForFunction((sid_) => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent.includes('#' + sid_));
  return card && card.textContent.includes('Dikirim');
}, { timeout: 15000 }, sid).then(() => true).catch(() => false);
console.log('8. SET RESI → KIRIM (admin):', ok8 ? 'BERHASIL (dikirim)' : 'GAGAL');

// 9) cleanup produk
await p.goto(U + '/admin/produk', { waitUntil: 'networkidle2', timeout: 30000 });
await p.evaluate((n) => {
  const card = [...document.querySelectorAll('div')].reverse().find(d => d.textContent.includes(n) && [...d.querySelectorAll('button')].some(b => b.textContent === 'Hapus'));
  const btn = card && [...card.querySelectorAll('button')].find(b => b.textContent === 'Hapus');
  btn && btn.click();
}, nama);
const ok9 = await p.waitForFunction((n) => !document.body.innerText.includes(n), { timeout: 15000 }, nama).then(() => true).catch(() => false);
console.log('9. CLEANUP produk:', ok9 ? 'BERSIH' : 'cek manual');

await b.close();
