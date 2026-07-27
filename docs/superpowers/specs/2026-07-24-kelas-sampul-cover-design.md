# Desain: Gambar Cover Kelas Bermain

Tanggal: 2026-07-24
Status: disetujui

## Tujuan
Menambahkan **gambar cover/sampul** untuk **Kelas Bermain** agar kartu share ke IG Story menampilkan cover menarik (bukan kartu brand polos), sekaligus tampil di halaman teaser publik (+ OG preview) dan di atas halaman detail materi. Artikel sudah punya `sampul_url` dan dipakai kartu Story — tidak disentuh.

## Ruang lingkup: Story + teaser + detail. Cover **opsional** (kelas tanpa cover tetap jalan).

## Unit & perubahan

### 1. Data
- **Migrasi `supabase/migrations/0083_kelas_sampul.sql`**:
  ```sql
  alter table public.kelas_bermain add column if not exists sampul_url text;
  ```
- `src/lib/game/tipe.ts` `interface KelasBermain`: tambah `sampul_url?: string | null;`.
- Tambah `sampul_url` ke SELECT:
  - `src/lib/data/kelas-bermain.ts` `COLS` (dipakai `getKelasSemua`/`getKelasAktif`).
  - `src/lib/data/publik.ts` `K` (dipakai `getKelasAktifCached`) + `getKelasPublik` select (tambah `sampul_url` + kembalikan di objek).
  - `src/app/kelas/[id]/page.tsx` `COLS`.
- `src/lib/data/kelas-bermain-actions.ts`:
  - `KelasInput` + `sampulUrl: string`.
  - `COLS` + `sampul_url`.
  - `row(i)` tulis `sampul_url: i.sampulUrl.trim() || null`.

### 2. Upload cover di form admin (`src/app/admin/kelas-bermain/KelasAdmin.tsx`)
- State `sampulUrl` di `KelasInput` awal (`KOSONG.sampulUrl = ''`); `bukaEdit` memuat `k.sampul_url ?? ''`.
- Kontrol upload (pola `TambahTemaForm`/`ArtikelForm`): tombol **"⬆ Gambar Cover"** + preview kecil + tombol hapus. Handler: `kompresGambar(file, { maksDim: 1280, kualitas: 0.82 })` → `storage.from('aset').upload('kelas/…', blob, { contentType })` → set `form.sampulUrl` ke public URL.
- Cover ikut terkirim saat `simpan()` (form sudah mengirim seluruh `form`).

### 3. Tampilan
- **Kartu Story & detail** — `src/components/KelasIsi.tsx`:
  - ShareButton kelas (yang sudah ada, `jenis="kelas"`): tambah `gambar={kelas.sampul_url ?? undefined}`.
  - **Banner cover** membulat di paling atas render (sebelum kartu info) bila `kelas.sampul_url` ada — pakai `<img>` `loading=lazy`/`decoding=async` (aspect ~16:9, `object-fit: cover`, `border-radius`).
- **Teaser publik** — `src/app/coba/kelas/[id]/page.tsx`:
  - `getKelasPublik` kembalikan `sampul_url`.
  - `generateMetadata`: `openGraph.images`/`twitter.images` pakai `sampul_url` bila ada (URL), else `${BASE}/opengraph-image`.
  - `<TeaserPublik gambar={sampul_url bila URL, else undefined} />`.

### 4. Testing
- **Manual**: (a) admin `/admin/kelas-bermain` → Edit/Tambah → upload cover → Simpan → cek `kelas_bermain.sampul_url` terisi (REST). (b) `/coba/kelas/[id]` incognito → cover tampil + OG image benar (view-source). (c) detail materi (login) → banner cover di atas. (d) Share → 📸 Bagikan ke Story → kartu memuat cover. (e) kelas tanpa cover → semua tetap jalan (brand/OG default/tanpa banner).
- Gerbang: `npx tsc --noEmit` + `npm test` + `npm run build` hijau. (Tak ada unit baru; perubahan UI/kolom.)

## Langkah manual pasca-implementasi
- Jalankan `0083_kelas_sampul.sql` di Supabase SQL Editor.

## Batas (YAGNI)
- Tidak menampilkan cover di kartu daftar admin & tidak di Mode Anak/Ortu list (hanya story/teaser/detail).
- Artikel tak diubah.
- Upload cover memakai `kompresGambar` (1280/0.82) yang sudah ada.
