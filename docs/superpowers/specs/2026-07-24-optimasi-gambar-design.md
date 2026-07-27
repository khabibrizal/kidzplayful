# Desain: Optimasi Gambar (kompres upload baru + backfill file lama)

Tanggal: 2026-07-24
Status: disetujui

## Tujuan
Mengecilkan ukuran file gambar di Supabase Storage bucket `aset` agar aplikasi ringan & hemat storage/bandwidth: (1) kompres pada semua titik upload baru yang belum tercakup (termasuk **bukti pembayaran** customer), (2) **backfill** kompres file gambar yang sudah terlanjur ter-upload.

## Batasan / prinsip
- Gambar yang butuh **resolusi cetak** TIDAK dikompres: background **sertifikat** & **stiker** event. **Worksheet PDF** bukan gambar → otomatis dilewati `kompresGambar`.
- Dokumen/bukti bayar harus tetap **terbaca** → kompresi sedang (1280px/0.8).
- Backfill **menimpa di path yang sama** (`upsert`) dengan `contentType: image/webp` → URL di DB tetap valid tanpa update referensi. Aman krena `<img>`/browser render berdasarkan content-type, bukan ekstensi.

## Tier kompresi
| Kategori | maksDim | kualitas |
|---|---|---|
| Dokumen & bukti bayar | 1280 | 0.8 |
| Gambar tampilan (sampul artikel, banner event, produk) | 1280 | 0.82 |
| Aset game (sudah) | 512 | 0.82 |
| Ikon tema (sudah) | 256 | 0.85 |
| Sertifikat/stiker bg, worksheet PDF | — (dikecualikan) | — |

`lib/img.ts` `kompresGambar(file, {maksDim, kualitas})` sudah ada; SVG/GIF dilewati, fallback ke asli bila hasil lebih besar/gagal.

## Unit & perubahan

### 1. Kompres saat upload baru
Bungkus `kompresGambar` (import dari `@/lib/img`) + kirim `contentType: blob.type` pada `.upload`. File yang diubah:
- `src/app/event/[id]/daftar/DaftarForm.tsx` (bukti bayar event) → `{ maksDim: 1280, kualitas: 0.8 }`.
- `src/app/pesanan/[id]/BuktiUpload.tsx` (bukti bayar pesanan) → `{ maksDim: 1280, kualitas: 0.8 }`.
- `src/components/UploadDok.tsx` (dokumen; PDF otomatis dilewati) → `{ maksDim: 1280, kualitas: 0.8 }`.
- `src/app/admin/artikel/[id]/ArtikelForm.tsx` (sampul artikel) → `{ maksDim: 1280, kualitas: 0.82 }`.
- `src/app/admin/produk/ProdukAdmin.tsx` (gambar produk) → `{ maksDim: 1280, kualitas: 0.82 }`.
- `src/app/admin/event/EventAdmin.tsx`: identifikasi 3 upload (baris ~44/194/222). **Hanya banner event (gambar_url)** yang dikompres `{1280,0.82}`; upload **sertifikat_bg** & **stiker bg** dibiarkan asli (tanpa kompres). Konfirmasi mapping saat implementasi dengan membaca konteks tiap `upload`.
- Pola tiap situs: `const { blob, ext } = await kompresGambar(file, {…}); const path = \`…/${…}.${ext}\`; await …upload(path, blob, { upsert: false, contentType: blob.type || undefined });` (ext & path pakai hasil kompres; bila file asli non-image, `kompresGambar` kembalikan file & ext asli).
- Tidak menyentuh `AsetInput`, `TambahTemaForm`, `UploadNota` (sudah kompres).

### 2. Backfill — `tools/backfill-kompres.mjs`
- Runtime Node ESM; deps: `@supabase/supabase-js`, `sharp` (devDependency, `npm i -D sharp`).
- Baca `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` dari `.env.local` (parse manual, jangan commit key).
- Argumen: default **DRY-RUN** (tak menulis), `--apply` untuk eksekusi nyata.
- Alur:
  1. Telusuri semua objek bucket `aset` rekursif (`storage.list` per folder; folder dari path).
  2. Untuk tiap objek, `perluKompres(path, size)` (helper murni, di `src/lib/backfill-util.ts` agar teruji) menentukan skip:
     - skip bila ekstensi bukan gambar raster (`jpg|jpeg|png|webp` → tapi `webp` juga skip krena sudah efisien),
     - skip bila path diawali `event/sertifikat` atau `event/stiker`,
     - skip bila `size < 300*1024` (300KB).
  3. Bila lolos: download (`storage.download`) → `sharp(buf).rotate().resize({ width:1280, height:1280, fit:'inside', withoutEnlargement:true }).webp({ quality:80 }).toBuffer()` → bila hasil < asli & `--apply` → `storage.upload(path, out, { upsert:true, contentType:'image/webp' })`.
  4. Log per file (path, lama→baru, hemat) + ringkasan akhir (jumlah diproses/skip, total hemat).
- Idempoten: file webp/kecil di-skip; run ulang aman.

### 3. Testing
- **Unit (vitest)** `src/lib/__tests__/backfill-util.test.ts`: `perluKompres` — skip webp, skip < 300KB, skip folder sertifikat/stiker, terima jpg/png besar di folder lain.
- **Manual**: (a) upload bukti bayar baru di `/event/[id]/daftar` & `/pesanan/[id]` → cek file di storage kecil & tetap terbaca; (b) jalankan `node tools/backfill-kompres.mjs` (dry-run) → tinjau daftar; (c) `--apply` pada subset → buka halaman terkait, gambar tetap tampil, URL sama.
- Gerbang: `npx tsc --noEmit` + `npm test` + `npm run build` hijau. (Skrip `.mjs` tidak ikut tsc app; helper `backfill-util.ts` ikut.)

## Langkah manual pasca-implementasi
- `npm i -D sharp` (bila belum), lalu `node tools/backfill-kompres.mjs` (dry-run) → `--apply`.
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` ada di `.env.local` (jangan commit).

## Batas (YAGNI)
- Backfill in-place, tanpa update referensi DB; kecuali sertifikat/stiker/PDF; ambang 300KB; tanpa UI admin; tanpa backup otomatis file asli (dry-run dulu sebagai pengaman).
