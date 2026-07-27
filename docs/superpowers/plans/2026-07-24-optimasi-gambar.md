# Optimasi Gambar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kompres gambar di semua titik upload baru (termasuk bukti pembayaran) + skrip backfill untuk file lama di Supabase Storage.

**Architecture:** Bungkus `lib/img.ts kompresGambar` (canvas→WebP) di titik upload yang belum tercakup; sertifikat/stiker dikecualikan. Backfill via skrip Node lokal `tools/backfill-kompres.mjs` (sharp, dry-run default, timpa path sama). Helper `perluKompres` dipisah agar teruji.

**Tech Stack:** Next.js 16 (client upload), Supabase Storage, `sharp` (script Node), Vitest.

Spec: `docs/superpowers/specs/2026-07-24-optimasi-gambar-design.md`.

Konvensi: commit `git -c commit.gpgsign=false ... -m "…"` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Gerbang: `npx tsc --noEmit` + `npm run build`.

Pola edit tiap situs upload: import `kompresGambar`, ganti `const ext = …` + `.upload(path, file, …)` menjadi memakai hasil kompres:
```ts
const { blob, ext } = await kompresGambar(file, { maksDim, kualitas });
const path = `<folder>/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
const { error } = await <sb>.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
```

## File Structure
- Modify (upload sites): `DaftarForm.tsx`, `BuktiUpload.tsx`, `UploadDok.tsx`, `ArtikelForm.tsx`, `ProdukAdmin.tsx`, `EventAdmin.tsx` (banner saja).
- Create `tools/backfill-util.mjs` — `perluKompres` (plain JS, shared script+test).
- Create `src/lib/__tests__/backfill-util.test.ts` — test `perluKompres`.
- Create `tools/backfill-kompres.mjs` — skrip backfill.
- Modify `package.json` — devDependency `sharp`.

---

### Task 1: Kompres bukti pembayaran (DaftarForm + BuktiUpload)

**Files:**
- Modify: `src/app/event/[id]/daftar/DaftarForm.tsx`
- Modify: `src/app/pesanan/[id]/BuktiUpload.tsx`

- [ ] **Step 1: DaftarForm — import + ganti upload**

Tambah import (dekat import lain di atas): `import { kompresGambar } from '@/lib/img';`

Ganti blok:
```tsx
      const sb = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `bukti/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
```
menjadi:
```tsx
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.8 });
      const path = `bukti/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
```

- [ ] **Step 2: BuktiUpload — import + ganti upload**

Tambah import: `import { kompresGambar } from '@/lib/img';`

Ganti blok:
```tsx
      const sb = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `bukti/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
```
menjadi:
```tsx
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.8 });
      const path = `bukti/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/event/[id]/daftar/DaftarForm.tsx src/app/pesanan/[id]/BuktiUpload.tsx
git -c commit.gpgsign=false commit -m "perf(gambar): kompres bukti pembayaran saat upload (1280/0.8)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Kompres upload lain (dokumen, artikel, produk, banner event)

**Files:**
- Modify: `src/components/UploadDok.tsx`
- Modify: `src/app/admin/artikel/[id]/ArtikelForm.tsx`
- Modify: `src/app/admin/produk/ProdukAdmin.tsx`
- Modify: `src/app/admin/event/EventAdmin.tsx`

- [ ] **Step 1: UploadDok — dokumen (PDF otomatis dilewati kompresGambar)**

Tambah import: `import { kompresGambar } from '@/lib/img';`

Ganti:
```tsx
      const sb = createClient();
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const path = `dok-sponsor/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false, contentType: file.type || undefined });
```
menjadi:
```tsx
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.8 });
      const path = `dok-sponsor/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
```

- [ ] **Step 2: ArtikelForm — sampul artikel**

Tambah import: `import { kompresGambar } from '@/lib/img';`

Ganti:
```tsx
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `artikel/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await supabase.storage.from('aset').upload(path, file, { upsert: false });
```
menjadi:
```tsx
      const supabase = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.82 });
      const path = `artikel/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await supabase.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
```

- [ ] **Step 3: ProdukAdmin — gambar produk**

Tambah import: `import { kompresGambar } from '@/lib/img';`

Ganti:
```tsx
      const sb = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `produk/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
```
menjadi:
```tsx
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.82 });
      const path = `produk/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
```

- [ ] **Step 4: EventAdmin — HANYA banner event (baris ~43)**

Tambah import: `import { kompresGambar } from '@/lib/img';`

Ganti HANYA blok banner event (path diawali `event/${Date.now()}` — BUKAN `event/sertifikat-` atau `event/stiker-`):
```tsx
      const path = `event/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
```
menjadi (ganti juga baris `const ext = …` sebelum path bila ada di blok fungsi banner tsb — pakai ext dari kompres):
```tsx
      const komp = await kompresGambar(file, { maksDim: 1280, kualitas: 0.82 });
      const path = `event/${Date.now()}-${Math.floor(performance.now())}.${komp.ext}`;
      const { error } = await sb.storage.from('aset').upload(path, komp.blob, { upsert: false, contentType: komp.blob.type || undefined });
```
JANGAN ubah blok `event/sertifikat-` (baris ~193) & `event/stiker-` (baris ~221) — biarkan upload file asli (butuh resolusi cetak).

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/UploadDok.tsx src/app/admin/artikel/[id]/ArtikelForm.tsx src/app/admin/produk/ProdukAdmin.tsx src/app/admin/event/EventAdmin.tsx
git -c commit.gpgsign=false commit -m "perf(gambar): kompres upload dokumen/artikel/produk/banner event

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Helper `perluKompres` + test

**Files:**
- Create: `tools/backfill-util.mjs`
- Test: `src/lib/__tests__/backfill-util.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/__tests__/backfill-util.test.ts
import { describe, it, expect } from 'vitest';
import { perluKompres } from '../../../tools/backfill-util.mjs';

const MB = 1024 * 1024;
describe('perluKompres', () => {
  it('terima jpg/png besar di folder biasa', () => {
    expect(perluKompres('produk/a.jpg', 2 * MB)).toBe(true);
    expect(perluKompres('bukti/x.png', 1 * MB)).toBe(true);
  });
  it('skip webp (sudah efisien)', () => {
    expect(perluKompres('produk/a.webp', 2 * MB)).toBe(false);
  });
  it('skip file kecil (<300KB)', () => {
    expect(perluKompres('produk/a.jpg', 100 * 1024)).toBe(false);
  });
  it('skip template sertifikat & stiker', () => {
    expect(perluKompres('event/sertifikat-1.jpg', 2 * MB)).toBe(false);
    expect(perluKompres('event/stiker-1.png', 2 * MB)).toBe(false);
  });
  it('skip non-gambar (pdf/svg)', () => {
    expect(perluKompres('dok-sponsor/a.pdf', 2 * MB)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test → gagal**

Run: `npx vitest run src/lib/__tests__/backfill-util.test.ts`
Expected: FAIL — module `../../../tools/backfill-util.mjs` belum ada.

- [ ] **Step 3: Write `tools/backfill-util.mjs`**

```js
// tools/backfill-util.mjs — aturan pemilihan file untuk backfill kompres (murni, teruji).
export function perluKompres(path, size) {
  const p = String(path).toLowerCase();
  if (p.startsWith('event/sertifikat') || p.startsWith('event/stiker')) return false; // template cetak
  const ext = p.split('.').pop();
  if (!['jpg', 'jpeg', 'png'].includes(ext)) return false; // webp/pdf/svg/gif dilewati
  if (size < 300 * 1024) return false; // sudah kecil
  return true;
}
```

- [ ] **Step 4: Run test → lulus**

Run: `npx vitest run src/lib/__tests__/backfill-util.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add tools/backfill-util.mjs src/lib/__tests__/backfill-util.test.ts
git -c commit.gpgsign=false commit -m "feat(backfill): helper perluKompres + test

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Skrip backfill `tools/backfill-kompres.mjs` + sharp

**Files:**
- Create: `tools/backfill-kompres.mjs`
- Modify: `package.json` (devDependency sharp)

- [ ] **Step 1: Pasang sharp**

Run: `npm i -D sharp`
Expected: sharp masuk `devDependencies` di `package.json`, exit 0.

- [ ] **Step 2: Write `tools/backfill-kompres.mjs`**

```js
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
```

- [ ] **Step 3: Uji sintaks skrip (tanpa kredensial nyata)**

Run: `node --check tools/backfill-kompres.mjs && node --check tools/backfill-util.mjs`
Expected: exit 0 (sintaks valid). (Eksekusi nyata dilakukan user manual dgn `.env.local`.)

- [ ] **Step 4: Commit**

```bash
git add tools/backfill-kompres.mjs package.json package-lock.json
git -c commit.gpgsign=false commit -m "feat(backfill): skrip kompres gambar lama Storage (sharp, dry-run default)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Gerbang mutu + dokumentasi + push

**Files:**
- Modify: `docs/DEVELOPER-KIDZPLAYFUL.md` (+ regen HTML/PDF)

- [ ] **Step 1: Gerbang mutu penuh**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc exit 0; semua test PASS (termasuk backfill-util.test.ts); build exit 0.

- [ ] **Step 2: Update DEVELOPER doc**

Di seksi "Optimasi gambar" (Kelola Tema) tambahkan: kompres kini juga di bukti pembayaran (DaftarForm/BuktiUpload 1280/0.8), dokumen (UploadDok), sampul artikel, gambar produk, banner event (1280/0.82) — sertifikat/stiker bg DIKECUALIKAN. Backfill file lama: `tools/backfill-kompres.mjs` (sharp, dry-run default `node tools/backfill-kompres.mjs`, nyata `--apply`, timpa path sama contentType webp, skip webp/<300KB/sertifikat/stiker; helper `tools/backfill-util.mjs perluKompres`). Butuh `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`. Regen HTML+PDF.

- [ ] **Step 3: Commit & push**

```bash
git add docs/DEVELOPER-KIDZPLAYFUL.md docs/DEVELOPER-KIDZPLAYFUL.html docs/DEVELOPER-KIDZPLAYFUL.pdf
git -c commit.gpgsign=false commit -m "docs: optimasi gambar (kompres upload + backfill script)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin master
```

---

## Verifikasi end-to-end (manual)
1. Upload bukti bayar baru di `/event/[id]/daftar` & konfirmasi pesanan `/pesanan/[id]` → cek file di Storage kecil (webp) & tetap terbaca.
2. Upload sampul artikel / gambar produk / banner event → terkompres; upload template sertifikat/stiker → TETAP resolusi asli.
3. `node tools/backfill-kompres.mjs` (dry-run) → tinjau daftar & estimasi hemat.
4. `node tools/backfill-kompres.mjs --apply` → buka beberapa halaman (event/produk/artikel), gambar tetap tampil, URL tak berubah.

## Catatan
- Backfill timpa in-place (URL tetap valid krn render by content-type). Jalankan dry-run dulu; tak ada backup otomatis file asli.
- `SUPABASE_SERVICE_ROLE_KEY` hanya di `.env.local` (jangan commit).
- `sharp` hanya devDependency (dipakai skrip lokal), tak masuk bundle aplikasi.
