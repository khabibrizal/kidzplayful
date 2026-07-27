// tools/backfill-kompres.mjs — kompres file gambar lama di Supabase Storage bucket 'aset'.
// Pakai: `node tools/backfill-kompres.mjs` (dry-run) → `node tools/backfill-kompres.mjs --apply`.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { perluKompres } from './backfill-util.mjs';

// baca .env.local
const env = {};
try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* env dari process.env saja */ }
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('Butuh NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di .env.local'); process.exit(1); }

const APPLY = process.argv.includes('--apply');
const BUCKET = 'aset';
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

async function listRekursif(prefix = '') {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 100, offset });
    if (error) throw error;
    if (!data || !data.length) break;
    for (const it of data) {
      const full = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) out.push(...await listRekursif(full)); // folder
      else out.push({ path: full, size: it.metadata?.size ?? 0 });
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

console.log(`Mode: ${APPLY ? 'APPLY (menimpa file)' : 'DRY-RUN (tanpa perubahan)'}`);
const files = await listRekursif('');
let n = 0, skip = 0, hematTotal = 0;
for (const f of files) {
  if (!perluKompres(f.path, f.size)) { skip++; continue; }
  const { data, error } = await sb.storage.from(BUCKET).download(f.path);
  if (error) { console.warn('gagal download', f.path, error.message); continue; }
  const buf = Buffer.from(await data.arrayBuffer());
  let out;
  try {
    out = await sharp(buf).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch (e) { console.warn('gagal kompres', f.path, e.message); continue; }
  if (out.length >= buf.length) { skip++; continue; } // tak lebih kecil → lewati
  hematTotal += buf.length - out.length; n++;
  console.log(`${APPLY ? '✓' : '(dry)'} ${f.path}  ${(buf.length / 1024 | 0)}KB → ${(out.length / 1024 | 0)}KB`);
  if (APPLY) {
    const { error: upErr } = await sb.storage.from(BUCKET).upload(f.path, out, { upsert: true, contentType: 'image/webp' });
    if (upErr) console.warn('gagal upload', f.path, upErr.message);
  }
}
console.log(`\n${APPLY ? 'SELESAI' : 'DRY-RUN'}: ${n} dikompres, ${skip} dilewati, hemat ~${(hematTotal / 1048576).toFixed(1)}MB`);
if (!APPLY) console.log('Jalankan ulang dengan --apply untuk menerapkan.');
