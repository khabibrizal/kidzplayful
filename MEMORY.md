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
- **Migrasi** SQL berurutan `supabase/migrations/0001..0041` (dijalankan di Supabase SQL Editor). Seed konten di `supabase/seed/`.

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

### 2026-07-03 — Game Koding TK (buku "Coding Anak TK") + timer/tantangan
- **11 engine game data-driven** (mesin + butir). Pola: `tipe.ts` (union `Mesin`+`DataX`) → `butir.ts` (butirDariForm/validasiButir) → `components/game/*.tsx` (`{data,onSelesai}`) → `GameRunner.tsx` (dispatch+timer+bonus) → `PaketForm.tsx` (buat+edit, `AREA`) → migrasi ALTER CHECK `paket_aset_mesin_check`. Detail per engine: `docs/DOKUMENTASI-KIDZPLAYFUL.md` §15d.
  - Dasar: `tekan-sesuai` (ManaYa), `seret-wadah` (BeresBeres), `cari-pasangan`, `mewarnai` (MewarnaiGame; +mode **berkode** color-by-number).
  - Baru sesi ini: **`dekode`** (Pecahkan Kode, 0029), **`urutan`** (Urutan&Pola urutkan/pola, 0030), **`jalur`** (Robot Grid, 0031), **`hitung`** (Hitung-Kode, 0032), **`cocokkan`** (Asosiasi, 0035), **`ejakata`** (Eja Kata, 0036), **`garis`** (Titik&Garis, 0037).
  - Cakup ~30/30 lembar buku. Contoh tiap engine ada di tema **"Contoh Koding"**.
- **Timer + Mode Tantangan** (migrasi **0033** `paket_aset.target_detik`): timer ⏱ live di GameRunner + waktu di Reward; selesai ≤ target → +1 bintang(maks3)+koin bonus+badge ⚡ (dihitung di `catatHasil`). Rapor: `laporan-anak.ts` +`rataDetik/tercepatDetik/perMesin` → section "Waktu per game".
- **Edit paket game**: `updatePaket()` + dropdown "Edit game yang ada" di PaketForm (hidrasi butir per mesin).
- **Stiker Nama** (migrasi **0034** `event.stiker_bg_url`): `/stiker-event/[id]` (`StikerSheet.tsx`) — lembar F4 10 stiker 9×6cm (nama+kelas) utk semua anak yang DAFTAR; upload template di panel event.
- Skrip e2e tiap engine: `tools/{koding,urutan,jalur,hitung,cocokkan,ejakata,garis,bonus,stiker}_check.mjs`.

### 2026-07-04 s.d. 07-06 — Pembayaran dinamis, performa, SEO & Blog
- **Master Pembayaran** (migrasi **0038** `pengaturan_pembayaran`, baris tunggal id=1): harga langganan + rekening/QRIS/WA **dinamis** diedit admin di `/admin/pengaturan-bayar` (menu 💰 Pembayaran). `lib/data/pengaturan-bayar.ts` `getPengaturanBayar()` (fallback `DEFAULT_BAYAR`) + `simpanPengaturanBayar` di `admin-bisnis.ts`. Dibaca di `/pengaturan`, `/pesanan/[id]`, default nominal `AktifkanForm`. (Sebelumnya hardcode di 2 tempat.)
- **Komunitas** — pemilih topik `Compose.tsx`: `datalist` → **`<select>`** + "Ketik sendiri" (fix bug tak bisa ganti topik kecuali dihapus).
- **Performa** (migrasi **0039** index + **0040** RPC): 0039 = 11 index kolom yang sering difilter (`pendaftaran_event`, `pesanan`, `item_pesanan`, `catatan_perkembangan`, `sertifikat`, `suka`, partial `postingan` tampil). 0040 = RPC `laporan_engagement()` (SECURITY DEFINER + guard admin, agregasi `hasil_main` di DB) + index `hasil_main(mesin|tema_id)`. Pagination admin (`admin/Pager.tsx`, `/admin/pesanan` 20/hal, `/admin/langganan` 30/hal), N+1 stok `verifikasiPesanan` via `.in()`, `next/image` di keranjang & daftar event.
- **SEO** (KUNCI: semua halaman internal redirect ke `/login` → hanya `/` & `/artikel` yang bisa di-crawl):
  - `app/page.tsx` = **landing publik** server-static (H1 kata kunci, fitur, usia, FAQ, NAP). App di balik login tak diubah.
  - Metadata lengkap `layout.tsx` (OG/twitter/keywords/robots/canonical/**verification.google**). `app/robots.ts` (disallow area privat), `app/sitemap.ts` (async + artikel), `app/opengraph-image.tsx` (next/og). JSON-LD Organization/WebSite/LocalBusiness+ChildCare/FAQPage (helper `bersih()` buang field kosong).
  - NAP `PROFIL` di `page.tsx`: telp **+6282233684933** + **Surabaya** terisi; alamat/jam/email kosong (opsional). **Search Console terverifikasi** (URL prefix, meta tag) + sitemap submitted. TODO: Google Business Profile.
- **Blog/Artikel** (migrasi **0041** tabel `artikel`): publik `/artikel` (+ **pencarian `?q`**) & `/artikel/[slug]` (generateMetadata + JSON-LD BlogPosting). Renderer `components/ArtikelBody.tsx` (markdown minimal, **tanpa dep & tanpa dangerouslySetInnerHTML**). Admin menu **📝 Artikel** (`/admin/artikel` + editor `ArtikelForm`, upload sampul bucket `aset`). Data `lib/data/artikel.ts` + `artikel-admin.ts`; `slugify` di `lib/slug.ts`. Seed **6 artikel** `supabase/seed/artikel_awal.sql`. Kartu "📖 Artikel & Tips" di Beranda (`/pilih-anak`, 3 terbaru). Halaman artikel **sadar login**: sembunyikan CTA "Coba Gratis"/"Daftar Gratis" saat login, nav ke Beranda.
- **Ops**: reset password user via SQL Editor (`update auth.users set encrypted_password = crypt(...)`); `.env.local` hanya anon key.
- **Roadmap** fitur mendatang: `docs/ROADMAP-KIDZPLAYFUL.{md,pdf}` (4 fase; pra-launch). **Fase 0 #1 SELESAI** = halaman legal: route group `src/app/(legal)/` (`layout.tsx`+`gaya.ts`) → `/kebijakan-privasi`, `/syarat-ketentuan`, `/tentang`, `/kontak` (statis, metadata masing-masing). Identitas/kontak di `lib/profil.ts` (brand "KidzPlayful", WA +62 822-3368-4933). Tautan di footer landing + sitemap. **Fase 0 #6 SELESAI** = onboarding: kartu "🌱 Langkah Awal" di Beranda (`components/OnboardingChecklist.tsx`, data-driven: adaAnak/adaAktivitas(count hasil_main via `anak!inner`)/statusAktif; hilang saat ada anak+pernah main).
- **Fase 2 #10 SELESAI** = gamifikasi retensi (migrasi **0042**): streak harian (`anak.streak`/`streak_terakhir`), 8 lencana (tabel `lencana_anak`), tantangan harian rotasi (tabel `tantangan_anak`, bonus koin 5/hari). Logika murni `lib/domain/gamifikasi.ts` (`tanggalWIB`, `evaluasiLencana`, `tantanganHariIni`), diintegrasi di `catatHasil` (skor.ts, dgn try/catch fallback pra-migrasi) + reader `lib/data/gamifikasi.ts`. Tampil di Reward, Menu Anak, Rapor. **Panel admin** (migrasi **0043**, policy admin update anak + kelola lencana): `/admin/anak` (menu 🧒 Anak) atur streak/koin/lencana per anak — `lib/data/admin-anak.ts` + `admin-anak-actions.ts`.
- **Stok Tantangan Kustom (quest builder)** (migrasi **0044**): admin bikin misi sendiri (`tantangan_kustom` + `tantangan_kustom_anak`, `hasil_main.paket_id`), syarat kombinasi game/jenis/tema + jumlah + minBintang → hadiah lencana bawaan + bonus koin, aktif/nonaktif. `/admin/tantangan` (menu 🏆 Tantangan, `TantanganForm`/`TantanganList`). Logika `lib/domain/tantangan-kustom.ts`, dievaluasi di `catatHasil`, tampil di Reward + Menu Anak (section MISI). Berdampingan dgn gamifikasi otomatis. **Rentang usia** (migrasi **0045** `usia_min`/`usia_max`): tantangan tampil/dievaluasi hanya utk anak yang umurnya masuk rentang (filter di getGamifikasiAnak & catatHasil pakai `umurTahun`). Belum: pembayaran otomatis (gateway), email transaksional, cron auto-expire, hapus akun.

### 2026-07 — Responsif mobile-first→tablet/desktop
- Poles global: `viewport` di `layout.tsx`, `body overflow-x:hidden`, `img/kontrol max-width:100%`, `*{min-width:0}`. Kelas utilitas di `globals.css`: `.kp-page` (fluid≤1040), `.kp-page-narrow` (≤680), `.kp-grid-produk` (2→3→4), `.kp-grid-kartu` (1→2→3). Halaman daftar/kartu (Store, `/pilih-anak`, `/event`, `/kelas-saya`, `/favorit`, `/pesanan`) pakai `.kp-page`+grid; form/detail (`/keranjang`,`/komunitas`,`/pengaturan`,`/pesanan/[id]`,rapor) pakai `.kp-page-narrow`; admin `.wrap` 760→1040. Layar game anak TETAP kolom HP. Default mobile tak berubah (perubahan hanya via breakpoint). Verifikasi puppeteer tanpa overflow 320–1280px.

### Log aktivitas & analitik fitur (migrasi 0046)
Tabel `aktivitas` (ortu_id/anak_id/fitur/dibuat_at, RLS insert-sendiri + admin-baca). `components/RekamAktivitas.tsx` (mount→`catatAktivitas`, `lib/data/aktivitas-actions.ts`) dipasang di menu utama (beranda/game/store/event/komunitas/kelas/pesanan/rapor). Reader `lib/data/aktivitas.ts` `getAktivitasRingkas` (per-user hari ini + fitur terpopuler hari ini/7h, WIB). `/admin/analitik` +3 seksi. Semua ber-fallback (aman pra-migrasi).

### Feedback aplikasi (migrasi 0047 + 0048)
Tabel `feedback` + kolom `jawaban jsonb` (survei terstruktur, RLS kirim-sendiri + admin-baca). Customer: seksi "Masukan untuk Aplikasi" di `/pengaturan` = **survei 8 pertanyaan** (`FeedbackForm`, tipe di `lib/feedback-tipe.ts`, action `feedback-actions.ts`). Admin `/admin/feedback` (menu ⭐ Masukan) tampil per-responden + rata-rata NPS (reader `lib/data/feedback.ts`).

## Catatan
- `mockups/` (demo.js/index.html) = prototipe statis, terpisah dari app Next.js.
- `tools/*.mjs` = skrip verifikasi e2e produksi (puppeteer).
- Gambar (11) tidak diekstrak semantik untuk hemat biaya vision; fokus graf = kode (AST) + dokumen plan/spec.

---
*Dihasilkan oleh /graphify. Perbarui: `/graphify d:\kidzplayful --update` lalu regenerasi memory dari `graphify-out/GRAPH_REPORT.md`.*
