# MEMORY.md — Peta Kode KidzPlayful

Ringkasan navigasi seluruh codebase, dihasilkan dari **knowledge graph** (`/graphify`). Graf penuh: `graphify-out/graph.html` (interaktif), audit: `graphify-out/GRAPH_REPORT.md`, data: `graphify-out/graph.json`.

- **Korpus:** 237 file (~171k kata) · **Graf:** 703 node, 1344 edge, 61 komunitas. *(graf belum di-regen; lihat "Update terbaru" di bawah untuk fitur setelah snapshot.)*
- **Stack:** Next.js 16 (App Router, TS) + Supabase (Postgres/RLS/Auth/Storage), deploy Vercel (region **bom1**). Live: **www.kidzplayful.com**. Backend = Server Components (baca) + Server Actions (tulis) + RLS. Ada **REST API** (`src/app/api/**`) untuk aplikasi **mobile Flutter**.

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
- **Migrasi** SQL berurutan `supabase/migrations/0001..0028` (dijalankan di Supabase SQL Editor).

## Update terbaru (setelah snapshot graf)
- **Game Mewarnai** (`mesin:'mewarnai'`): `components/game/MewarnaiGame.tsx`, `lib/game/templates-mewarnai.ts` (template bawaan), `lib/game/svg-sanitize.ts` (upload SVG aman), admin `TargetEditor.tsx` (mode sesuai). Mode Bebas/Sesuai, skor area `kreativitas`. Migrasi 0025 (izin mesin).
- **REST API mobile (Flutter)**: `src/app/api/**` (auth/anak/kelas-bermain/events/produk/keranjang/pesanan/me) + `lib/api/helpers.ts` (Bearer). Kontrak: `docs/API-MOBILE.md`.
- **Performa**: region Vercel `bom1`; `lib/data/publik.ts` (cache katalog `unstable_cache`, baca anon migrasi 0022); `Promise.all` di halaman berat; `next/image`.
- **Domain**: `www.kidzplayful.com` (Vercel + DomaiNesia + Supabase Auth URL). Logo `components/Logo.tsx` (`public/logo.png`) + favicon.
- **Store**: checkout auto-isi dari profil; **Akun → Data Pengiriman** (`ProfilPengirimanForm`, `profiles.alamat` migrasi 0023). Kategori produk dropdown.
- **Anak**: `jenis_kelamin` (migrasi 0024) + form tambah anak collapse.

### 2026-07-02
- **E-Sertifikat event** (migrasi **0026**): absensi hadir per anak (`pendaftaran_event.hadir_anak_ids`), template JPEG + link dokumentasi per event (`event.sertifikat_bg_url`/`dokumentasi_url`), tabel `sertifikat` (snapshot + RLS). Admin (halaman Pendaftar): tombol Hadir per anak, upload template JPEG → **auto-generate** untuk anak hadir, tombol unduh sertifikat per anak, **badge "N anak hadir"** pojok kanan atas. User: halaman `/sertifikat/[id]` (`components/SertifikatView.tsx`, Unduh PDF landscape; teks apresiasi di-overlay di atas template) + section di Rapor anak. Data: `lib/data/sertifikat.ts`, `admin-sertifikat-actions.ts` (`generateSertifikatEvent`,`hapusSertifikat`).
- **Reschedule pendaftaran** (migrasi **0027**): `reschedulePendaftaran` pindah pendaftaran ke event aktif lain + alasan (`event_asal_id`,`alasan_reschedule`); pembayaran terbawa, absensi direset. Tombol 🔁 di kartu Pendaftar.
- **Pendaftaran per-anak**: `getPesertaPerEvent` (nama+status per anak) → kartu event tampilkan **"Anak terdaftar"** + tombol **"Daftarkan anak lainnya (N)"**; halaman daftar hanya menampilkan anak belum terdaftar; `daftarEvent` cegah duplikat.
- **Rapor anak** (`/anak/[anakId]/laporan`): daftar per-event **collapse** (`<details>`) — catatan + sertifikat + dokumentasi digabung per event.
- **Pesanan admin**: ongkir bisa dikoreksi saat status `menunggu_bayar`; `setOngkir` `revalidatePath('/pesanan')`.
- **Nav admin persisten**: `src/app/admin/AdminNav.tsx` di `layout.tsx` — menu utama selalu tampil & tandai aktif + tombol **Back** (`router.back()`) di semua sub-halaman; grid menu dashboard + link "← dashboard" inline dihapus.
- **Embed YouTube di materi**: link `link_ide` YouTube tampil sebagai **iframe** (`components/YoutubeEmbed.tsx` + util `lib/youtube.ts`), fallback tombol utk non-YouTube. Dipakai di `/kelas/[id]`, Mode Anak, Mode Ortu.
- **Komunitas topik** (migrasi **0028**): `postingan.topik` (teks bebas) menggantikan pemakaian `tema_id`; opsi topik = judul Kelas Bermain + Event + Game (`getTopikOptions`, datalist di `Compose`); tombol **"Bagikan pengalaman"** dari materi prefill `?topik=<judul>`.
- **Analitik**: `/admin/analitik` — DAU/WAU/MAU akun ortu, aktivitas 30 hari (sesi main, pendaftaran, pesanan, postingan, komentar), game & ortu teraktif (data Supabase, RLS admin baca 0006) + **Vercel Web Analytics** (`@vercel/analytics` `<Analytics/>` di layout; aktifkan Web Analytics di dashboard Vercel).
- **Logo baru** transparan; `components/Logo.tsx` default `plate=false` (tanpa kotak hitam).

## Catatan
- `mockups/` (demo.js/index.html) = prototipe statis, terpisah dari app Next.js.
- `tools/*.mjs` = skrip verifikasi e2e produksi (puppeteer).
- Gambar (11) tidak diekstrak semantik untuk hemat biaya vision; fokus graf = kode (AST) + dokumen plan/spec.

---
*Dihasilkan oleh /graphify. Perbarui: `/graphify d:\kidzplayful --update` lalu regenerasi memory dari `graphify-out/GRAPH_REPORT.md`.*
