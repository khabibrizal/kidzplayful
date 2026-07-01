# MEMORY.md — Peta Kode KidzPlayful

Ringkasan navigasi seluruh codebase, dihasilkan dari **knowledge graph** (`/graphify`). Graf penuh: `graphify-out/graph.html` (interaktif), audit: `graphify-out/GRAPH_REPORT.md`, data: `graphify-out/graph.json`.

- **Korpus:** 237 file (~171k kata) · **Graf:** 703 node, 1344 edge, 61 komunitas.
- **Stack:** Next.js 16 (App Router, TS) + Supabase (Postgres/RLS/Auth/Storage), deploy Vercel. Backend = Server Components (baca) + Server Actions (tulis) + RLS.

## Abstraksi inti (God Nodes — paling banyak terhubung)
1. **`createClient()`** (supabase server/browser) — 73 edge. Gerbang semua akses data.
2. **`formatRupiah()` / `formatTanggal()`** (`src/lib/format.ts`) — util tampilan dipakai lintas fitur (Store, Event, Catatan).
3. **`db()` / `adminDb()`** — guard admin (cek `is_admin`) sebelum aksi tulis.
4. **`umurTahun()`** (`src/lib/domain/anak.ts`) — penentu Mode Anak vs Mode Ortu & rekomendasi game.
5. **`EventKelas`** (tipe) — simpul fitur Event/Pendaftaran/Catatan.
6. `$()` & fungsi `mockups/demo.js` — prototipe demo (terpisah dari app).

## Peta Modul (komunitas utama)
| # | Modul | Isi |
|---|---|---|
| 0 | **Halaman User & Mode Anak** | `MenuAnak`, `MainPage`, `ModeOrtu`, `PilihGamePage`, `getAnakTerjamin`, favorit, `getEventDiikuti` |
| 1 | **Admin Kelas & Auth** | `AdminLayout`, `getAdminTerjamin`, `adminDb`, CRUD kelas (`buatKelas`…), `AsetInput` |
| 2 | **Admin Konten & Paket Game** | `buatTema/buatPaket/buatVideo`, `ekstrakYoutubeId`, `aktifkanLangganan`, `db()` |
| 3 | **Laporan, Langganan & Catatan** | `getCatatan*`, `getEvent*`, `getStatusPendaftaranSaya`, laporan anak |
| 5 | **Rencana Kelas Bermain & Komunitas** | dokumen plan M9–M11 + tabel panduan/postingan/komentar/suka |
| 6 | **Komunitas (Forum)** | `getFeed`, `buatPostingan/Komentar`, `toggleSuka`, `lapor`, `setNamaTampilan` |
| 7 | **Admin Event & Pendaftaran** | `buatEvent`, `setStatusPendaftaran` (Terima/Tolak), `EventInput` |
| 8 | **Mesin Game** | `GameRunner`, `ManaYa/BeresBeres/CariPasangan`, `hitungBintang`, `catatHasil` |
| 9 | **Prototipe Demo Game** | `mockups/demo.js` (PIN, confetti, drag) — bukan bagian app produksi |
| 10 | **Rencana Area Ortu & Event/Store** | plan M8/M14/M16: event, pendaftaran, keranjang, checkout |
| 11 | **Kelola Anak & PIN** | `updateAnak/setPin/setBatas/hapusAnak`, `modeDefault`, `umurTahun` |
| 13 | **Keranjang & Navigasi Bawah** | `KeranjangView`, `BottomNav`, `TambahKeranjangBtn`, `jumlahKeranjang` |
| 14 | **Admin Store** | `ProdukAdmin`, `PesananAdmin`, `admin-store-actions` (ongkir/verifikasi/resi) |
| 15 | **Catatan Perkembangan (Guru)** | `GuruNilai`, `CatatanCard`, `simpanCatatan`, `nomorWaIntl` |
| 16 | **Tipe Data & Panduan Legacy** | `tipe.ts`, `panduan.ts` (getModeOrtu/getKelasBermain — legacy) |
| 18 | **Admin Kelola Guru** | `GuruAdmin`, `jadikanGuru/cabutGuru` |
| 4, 12 | **Konfigurasi** | `package.json` (deps), `tsconfig.json` |

## Alur Kunci (hyperedges)
- **Konten data-driven:** tema/`paket_aset.butir` → mesin game (1 engine, banyak tema).
- **Skor anak:** game → `catatHasil` → `hasil_main` → Laporan/Rapor.
- **Komunitas:** postingan/komentar/suka + `nama_tampilan` (snapshot) + moderasi admin.
- **Evolusi Kelas Bermain:** `panduan` per-tema → tabel `kelas_bermain` mandiri → `bahan`/`aktivitas` jsonb (+ link produk Store).
- **Event → Pendaftaran → Catatan Perkembangan:** `event` → `pendaftaran_event` (bukti bayar, Terima/Tolak) → `catatan_perkembangan` (rubrik PAUD oleh guru) → tampil ke ortu (`/kelas-saya`, `/catatan`, rapor).
- **Store:** produk → keranjang (DB) → checkout → pesanan (ongkir admin → bayar+bukti → verifikasi/stok → resi → selesai).

## Pola arsitektur (untuk dipegang saat menambah fitur)
- **Baca** = fungsi di `src/lib/data/*` dipanggil Server Component. **Tulis** = Server Action `'use server'` di `*-actions.ts`.
- **Keamanan utama = RLS** per tabel + guard `getAnakTerjamin`/`getAdminTerjamin`/`getGuruTerjamin`/`adminDb`. Query "milik sendiri" selalu `.eq(..user.id)`.
- **Peran:** `profiles.is_admin` / `is_guru` (fungsi `is_admin()`/`is_guru()`); trigger `cegah_self_admin` cegah promosi diri.
- **Total uang dihitung ulang di server**; harga di-snapshot (item_pesanan).
- **Migrasi** SQL berurutan `supabase/migrations/0001..0021` (dijalankan di Supabase SQL Editor).

## Catatan
- `mockups/` (demo.js/index.html) = prototipe statis, terpisah dari app Next.js.
- `tools/*.mjs` = skrip verifikasi e2e produksi (puppeteer).
- Gambar (11) tidak diekstrak semantik untuk hemat biaya vision; fokus graf = kode (AST) + dokumen plan/spec.

---
*Dihasilkan oleh /graphify. Perbarui: `/graphify d:\kidzplayful --update` lalu regenerasi memory dari `graphify-out/GRAPH_REPORT.md`.*
