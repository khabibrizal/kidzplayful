# Desain: Bagikan Konten ke Sosial Media

Tanggal: 2026-07-24
Status: disetujui (Pendekatan A)

## Tujuan
User (orang tua) dapat membagikan konten KidzPlayful — **Artikel**, **Kelas Bermain**, dan **Game Edukasi (per tema)** — ke sosial media, sehingga orang lain jadi **aware** terhadap isi konten dan tergerak **ikut mendaftar & mengonsumsi** konten KidzPlayful.

## Masalah
- **Artikel** (`/artikel/[slug]`) sudah **publik** dan punya OG metadata lengkap → siap dibagikan langsung.
- **Kelas bermain** (`/kelas/[id]`) dan **Game** (`/main/[anakId]`, `/pilih-game/[anakId]`) berada **di balik login**. Membagikan URL-nya apa adanya membuat orang non-login kena tembok `/login` + preview sosmed generik → gagal menarik orang baru.

## Pendekatan (A): Halaman teaser publik + komponen ShareButton
Buat halaman **teaser publik** khusus untuk konten yang gated, dengan OG metadata, lalu tombol share mengarah ke teaser tersebut. Gating halaman asli tak disentuh; konten berbayar tak bocor (teaser hanya metadata ringan).

## Ruang lingkup unit

### 1. Akses data publik
- `kelas_bermain`: sudah ada policy baca anon (`0022_katalog_anon.sql`, `status='aktif'`). Cukup.
- `tema` & `paket_aset`: saat ini **hanya `authenticated`**. Perlu **migrasi baru**:
  - **`supabase/migrations/0081_katalog_anon_tema.sql`**: tambah policy `for select to anon using (status='disetujui')` pada `public.tema` dan `public.paket_aset` (pola sama dengan 0022). Tanpa ini teaser tema gagal load untuk pengunjung non-login.
- Teaser membaca via client **anon** (pola `src/lib/data/publik.ts`), field seminimal mungkin.

### 2. Komponen `ShareButton` (client, reusable)
- File: `src/components/ShareButton.tsx`.
- Props: `{ url: string; title: string; text?: string; label?: string }`.
- Perilaku:
  - Bila `navigator.share` tersedia → panggil `navigator.share({ title, text, url })` (share sheet bawaan HP: WA, IG, TikTok, dst).
  - Fallback (desktop/tak didukung) → popover berisi tombol: **WhatsApp**, **Facebook**, **X/Twitter**, **Telegram**, **Salin link** (clipboard + toast "Link disalin ✓").
- URL builder sosmed diletakkan di util murni **`src/lib/share.ts`** (`tautanShare(target, {url,text})`) agar bisa diuji unit.
- Gaya: ikon 🔗 + teks "Bagikan", mengikuti kelas `kp-btn`/`kp-btn putih`.

### 3. Halaman teaser publik
- Rute: **`/coba/kelas/[id]`** dan **`/coba/tema/[id]`**.
- Layout (komponen bersama `TeaserLayout` opsional):
  - Logo/brand KidzPlayful.
  - **Gambar**: tema → `tema.sampul` bila berupa URL (via komponen `Sampul`); kelas → OG default berbrand (kelas tak punya gambar).
  - **Judul** konten.
  - **Deskripsi singkat**: kelas → `tujuan` + rentang usia; tema → daftar nama game (`paket_aset.judul`) + jumlah permainan.
  - **CTA** utama: "✨ Coba Gratis di KidzPlayful" → `/daftar`; sekunder: "Sudah punya akun? Masuk" → `/login`.
- `generateMetadata` per rute → `openGraph` + `twitter` (title, description, images). Base URL `https://www.kidzplayful.com`.
- **Batas keamanan**: teaser hanya menampilkan metadata ringan (judul, tujuan, daftar nama game) — TIDAK menampilkan butir/soal/langkah/materi penuh. Konten berbayar tetap hanya untuk yang login.
- Bila id tidak ditemukan / status bukan publik → `notFound()` (404).

### 4. Penempatan tombol Share
- **Artikel** `/artikel/[slug]` (publik): `<ShareButton url={BASE + '/artikel/' + slug} title text />` — membagikan URL artikel itu sendiri.
- **Kelas** `/kelas/[id]`: pasang di `components/KelasIsi.tsx` dekat tombol "Bagikan pengalaman" → `url = BASE + '/coba/kelas/' + id`.
- **Game (tema)**: di `MenuAnak` (header layar daftar game per tema) dan `PilihGame` → `url = BASE + '/coba/tema/' + temaId`.

### 5. Testing
- **Unit (vitest)**: `src/lib/share.ts` — `tautanShare` menghasilkan URL benar untuk WhatsApp/Facebook/X/Telegram dan meng-encode `url`+`text`.
- **Manual**: buka `/coba/kelas/[id]` & `/coba/tema/[id]` di incognito (tanpa login) → tampil dengan CTA yang berfungsi; verifikasi OG metadata (title/description/image) via view-source / debugger sosmed.
- Gerbang mutu: `npx tsc --noEmit` + `npm run build` hijau.

## Yang TIDAK termasuk (YAGNI)
- Tidak ada analitik/track share (bisa menyusul via UTM di URL).
- Tidak ada share per-game individual (keputusan: per tema).
- Tidak mengubah gating halaman asli.
- Tidak membuat gambar OG dinamis per kelas (pakai OG default berbrand); tema pakai sampul yang ada.

## Langkah manual pasca-implementasi
- Jalankan `0081_katalog_anon_tema.sql` di Supabase SQL Editor.
