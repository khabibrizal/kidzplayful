# Dokumentasi Teknis — KidzPlayful

Dokumen ini menjelaskan **seluruh alur** aplikasi KidzPlayful dari nol sampai deploy: arsitektur, tiap berkas & perannya, parameter penting, skema database, serta cara deploy ke **Vercel** (frontend) dan **Supabase** (backend).

- **Aplikasi:** web app bermain & belajar anak 0–6 tahun. Sisi pengguna: game sensorik/motorik/kognitif & calistung (11+ mesin), **Ide Bermain** (dulu "Kelas Bermain" — materi main di rumah), Pojok Video, komunitas, **event offline berbayar + pendaftaran**, **toko/Store**, **Catatan Perkembangan Bermain** (penilaian guru), **Chat Psikolog**, artikel/blog, gamifikasi (streak/lencana/tantangan), voucher, dan **reminder WhatsApp**. Sisi bisnis: **modul Keuangan** (ledger, anggaran, aset, pajak, KPI, insight), **Sponsor**, **Langganan**, **Analitik**, dan **Akses Menu per role**. Ada juga **REST API untuk aplikasi mobile (Flutter)**.
> **Status dokumen: LENGKAP sampai migrasi 0088 (2026-08-19).** Dokumen ini adalah gambaran menyeluruh — arsitektur, skema, alur, deploy — dan riwayat fitur berurutan waktu (§15b…§15g). Untuk detail **per halaman/menu** (file mana, reader/server-action mana, tabel mana yang disentuh) lihat [`DEVELOPER-KIDZPLAYFUL.md`](DEVELOPER-KIDZPLAYFUL.md); untuk rencana skala & prosedur operasional lihat [`INFRASTRUKTUR-KIDZPLAYFUL.md`](INFRASTRUKTUR-KIDZPLAYFUL.md) dan [`RUNBOOK-OPERASIONAL.md`](RUNBOOK-OPERASIONAL.md). Bila terjadi perbedaan, **DEVELOPER yang menang** karena dokumen itulah yang diperbarui setiap kali fitur berubah.

- **Repo:** `github.com/khabibrizal/kidzplayful` · **Live:** `https://www.kidzplayful.com` (domain kustom; region Vercel `bom1` = co-located dgn Supabase `ap-south-1`).
- **Stack:** Next.js 16 (App Router, TypeScript) + Supabase (Postgres + Auth + Storage). "Backend" = Supabase + Server Actions/Server Components Next.js (tanpa server terpisah).
- **Peran pengguna (kolom boolean di `profiles`):** Orang tua (default) · **Super User** (`is_superuser`, tertinggi) · **Admin** (`is_admin`) · **Guru** (`is_guru`) · **Investor** (`is_investor`, baca dashboard keuangan) · **Psikolog** (`is_psikolog`). Menu admin mana yang boleh dibuka tiap role diatur super user (tabel `pengaturan_menu`, migrasi 0063).

---

## 1. Arsitektur Singkat (FE & BE)

```
Browser (HP/Tablet/Laptop)
   │  HTML/JS dari Next.js
   ▼
Next.js (di Vercel)                         ← "Frontend + lapisan server"
   ├─ Server Components  : render halaman di server, baca data (aman)
   ├─ Client Components  : interaktif di browser ('use client')
   ├─ Server Actions     : fungsi tulis di server ('use server')
   └─ proxy.ts (middleware): segarkan sesi login tiap request
   │  via @supabase/ssr (cookie sesi)
   ▼
Supabase (cloud)                            ← "Backend"
   ├─ Auth      : akun & sesi (email+password) + reset password
   ├─ Postgres  : tabel + RLS + trigger/function (is_superuser/is_admin/is_guru/
   │              is_investor/is_psikolog) + RPC agregasi (laporan, kuota, konsultasi)
   └─ Storage   : bucket 'aset' (gambar game/worksheet/event/produk/logo, bukti bayar)
```

**Keamanan utama = RLS** (Row Level Security) di Supabase: aturan database menentukan baris mana boleh dibaca/ditulis siapa.

---

## 2. Tech Stack

Next.js 16 (App Router) · TypeScript · Supabase (@supabase/ssr) · Vitest (unit) · Playwright/puppeteer-core (e2e & verifikasi prod) · Vercel (hosting, auto-deploy) · CSS global + module (tema pastel + maskot Pewi + **logo `public/logo.png`**).

---

## 3. Menjalankan di Lokal

```bash
cd d:\kidzplayful
npm install
npm run dev      # http://localhost:3000
npm test         # unit (Vitest)
npm run e2e      # end-to-end (Playwright)
npm run build    # build produksi (cek error + ESLint)
npm run lint
```

---

## 4. Variabel Lingkungan (`.env.local`)

| Variabel | Untuk apa |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Alamat proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci **publishable** (aman di browser) |

`NEXT_PUBLIC_` → disuntik ke bundel browser saat build (harus ada sebelum build). Keamanan dijaga RLS, bukan kerahasiaan kunci ini. **Jangan** pakai secret key.

---

## 5. Konsep Next.js

- **Server Component** (default): baca data di server. **Client Component** (`'use client'`): interaktif. **Server Action** (`'use server'`): tulis data.
- `params`/`searchParams` = Promise (await). `redirect()`, `revalidatePath()`, `useRouter().push()/refresh()`. `proxy.ts` = penyegar sesi.
- Rute = folder `src/app/`; `[x]` = parameter dinamis.

---

## 6. Supabase — Konsep

- **Auth:** email+password; daftar → trigger buat `profiles` + `langganan` trial. Reset password: `resetPasswordForEmail` → email → `/reset-sandi` (`updateUser`).
- **Fungsi RLS:** `is_admin()` & **`is_guru()`** (cek kolom di `profiles`).
- **Storage** (`aset`, publik baca): tulis admin (folder `produk/`, `event/`, `worksheet/`) & user (folder `bukti/`). Logo brand = `public/logo.png` (bukan Storage).
- **Client:** `lib/supabase/client.ts` (browser), `server.ts` (server, cookie).

---

## 7. Skema Database (per tabel)

Migrasi `supabase/migrations/0001..0088` (jalankan berurutan di SQL Editor; tidak ada CLI migrate — semuanya manual).

### `profiles` (0001; +is_admin 0004; +nama_tampilan 0010; +no_wa 0015; +is_guru 0020; +alamat 0023; +is_investor 0052; +is_superuser 0056; +is_psikolog 0064)
`id(PK), email, pin_ortu, is_superuser, is_admin, is_guru, is_investor, is_psikolog, nama_tampilan, no_wa, alamat, created_at`. RLS: profil sendiri; admin baca semua + **admin update profil** (untuk set/cabut role). **Trigger `cegah_self_admin` (0012; diperluas 0020, 0056, 0064):** non-admin tak bisa mengubah kolom role apa pun — `is_superuser` hanya lewat SQL Editor, sisanya lewat halaman admin.

### `anak` (0001; +jenis_kelamin 0024; +streak/streak_terakhir 0042; +nama_panggilan 0071) · `langganan` (0001) · `tema`/`paket_aset`/`hasil_main`/`video`
- `anak.jenis_kelamin`: 'laki-laki' | 'perempuan' (opsional); `anak.nama_panggilan` dipakai di **stiker event** (nama lengkap dipakai di **sertifikat**). `paket_aset.mesin` diperluas per mesin baru lewat CHECK constraint (0025 mewarnai, 0029–0037, 0074 calistung, 0080 ingatan) — **menambah mesin tanpa migrasi = INSERT paket ditolak DB**. `paket_aset.kategori_usia_id` (0079) + snapshot `usia_min/usia_max`. Katalog (event/produk/kelas_bermain publik) boleh **dibaca anon** (0022), diperluas ke tema & paket untuk halaman teaser `/coba/*` (0081).
Profil anak, langganan trial, konten game/tema/skor/video (lihat versi sebelumnya — tetap).

### `kelas_bermain` (0014; jsonb 0016; +produk_id; +tujuan/usia 0076; +fokus_area/peran_ortu 0077; +sampul_url 0083) — kini bernama tampilan **Ide Bermain**
`judul`, `bahan` jsonb `[{nama, link, produk_id}]` (link toko luar / produk Store internal), `aktivitas` jsonb `[{judul, cara_membuat, langkah[]}]`, `link_ide`, `worksheet_url`, `status`, `tujuan`, `usia_min/usia_max`, `fokus_area text[]` (key dari master `fokus_area`), `peran_ortu`, `sampul_url` (dipakai kartu share IG & teaser), `boleh_trial` (0060).

### `favorit` (0015) · `riwayat_kelas` (0018)
Favorit kelas & riwayat materi yang dibuka (PK gabungan ortu+kelas; RLS milik sendiri).

### `event` (0017) · `pendaftaran_event` (0017; +reminder_terkirim 0021)
- `event`: judul, lokasi, tanggal, jam_mulai/selesai, deskripsi, gambar_url, harga_per_anak, status(tampil/arsip); +`sertifikat_bg_url`/`dokumentasi_url` (0026), `stiker_bg_url` (0034), **dua kelas** `baby_*`/`toddler_*` tanggal & jam (0069), `harga_pendamping` (0070), `indikator_perkembangan` jsonb (0062), `pesan_reminder` (0085), `kuota_baby/kuota_toddler/kuota_gabungan` (0086; null/0 = tanpa batas, terpakai dihitung RPC `kuota_terpakai_event`).
- `pendaftaran_event`: event_id, ortu_id, anak_ids[], anak_nama[], jumlah_anak, total, bukti_url, status(menunggu/diterima/ditolak), **reminder_terkirim**; +`hadir_anak_ids[]` (0026, absensi per anak → dasar sertifikat), `event_asal_id`/`alasan_reschedule` (0027), `kelas`/`kelas_jadwal` (0069), `jumlah_pendamping` (0070), `alasan_tolak` (0075), `voucher_id`/`potongan_voucher` (0084), `ref_sumber`/`ref_saluran`/`ref_jenis` (0082, atribusi dari share).
- RLS: milik sendiri + admin update; **guru boleh baca** (0020); **ortu boleh baca `event` yang pernah ia daftari walau sudah diarsipkan** (0068) — itulah yang membuat rapor & dokumentasi event lama tetap terbuka.

### `produk` / `keranjang_item` / `pesanan` / `item_pesanan` (0019) — Store
Produk (nama, deskripsi, kategori, harga, stok, gambar, status) · keranjang DB · pesanan (status: menunggu_ongkir→…→selesai) · item snapshot. (lihat versi sebelumnya — tetap.)

### `catatan_perkembangan` (0020) — Catatan Perkembangan Bermain
| Kolom | Arti |
|---|---|
| `event_id`, `anak_id`, `ortu_id` | relasi (ortu_id untuk RLS ortu) |
| `aspek` (jsonb) | `{fisik_motorik:'BSH', sosial_emosional:'MB', kognitif:'BSH', bahasa:'BSB'}` (skala PAUD) |
| `catatan` | catatan teks dari guru |
| `dinilai_oleh` | nama guru (snapshot) |
| unik | `(event_id, anak_id)` |
RLS: **ortu baca catatan anaknya**, admin & **guru** baca; **guru** insert/update.

### `sertifikat` (0026) · `stiker` (kolom `event.stiker_bg_url`, 0034)
`sertifikat`: snapshot per (event, anak) — `anak_nama`, `event_judul`, `event_tanggal`, `lokasi`, `bg_url`, `dokumentasi_url`, `diterbitkan_oleh`; unik `(event_id, anak_id)` sehingga generate bersifat **idempoten**. Hanya dibuat untuk anak yang ada di `hadir_anak_ids`. Nama & link dokumentasi **dibaca ulang dari sumber aslinya** saat ditampilkan (snapshot hanya cadangan) — lihat §15g.

### `penilaian_perkembangan` (0062)
Parameter per event di `event.indikator_perkembangan` jsonb `[{area, indikator}]` (ditetapkan admin, berlaku untuk semua anak di event itu); nilai per anak di `catatan_perkembangan.penilaian` jsonb `[{area, indikator, nilai}]` (skala PAUD). Kolom lama `catatan_perkembangan.aspek` dipertahankan sebagai fallback.

### Modul Keuangan (0052–0055, 0088)
| Tabel | Isi |
|---|---|
| `transaksi_keuangan` | **ledger tunggal**: `arah`(masuk/keluar), `kategori`, `jumlah`, `tanggal`, `metode`, `keterangan`, `ref_tipe`/`ref_id` (pesanan/pendaftaran/langganan/aset/manual), `lampiran_url`, `pic`, `event_id` (0088 — pengeluaran untuk event tertentu). Unik `(ref_tipe, ref_id)` supaya satu sumber tak tercatat dua kali |
| `pembayaran_langganan` | riwayat pembayaran membership (nominal, periode, metode) |
| `aset` | aset perusahaan (harga beli, tanggal, umur manfaat, lokasi, invoice) + master `kategori_aset` (0053) |
| `anggaran` | budget per `ym` (YYYY-MM) × kategori pengeluaran, unik `(ym, kategori)` (0054) |
| `kategori_pengeluaran` | master kategori (`kode` = nilai stabil yang tersimpan di ledger; `bawaan` tak bisa dihapus) (0055) |
RLS: admin penuh; **investor baca**. Semua pendapatan masuk ledger lewat helper `catatLedger` — pendaftaran event diterima, pesanan diverifikasi, langganan diaktifkan, sponsorship dibayar.

### Modul Sponsor (0058)
`sponsor` (perusahaan, PIC, kontak, NPWP, industri) + `sponsorship` (deal): `jenis` uang|barang, `nilai`, `benefit`, `status` lead→negosiasi→kesepakatan→invoice→dibayar→selesai|batal, nomor & tanggal invoice, jatuh tempo, data pembayaran, `quotation_url`/`agreement_url`/`bukti_url`. **Sponsor uang** masuk ledger (kategori `sponsorship`) saat berstatus Dibayar; **sponsor barang (in-kind)** dicatat nilainya tapi **tidak** masuk kas.

### Pembatasan trial & akses menu (0059–0061, 0063, 0067)
- `pengaturan_trial` (baris tunggal): `trial_kelas`, `trial_game`, `trial_video`, `trial_maks_anak`, plus opsi Komunitas (0061).
- `boleh_trial` **per item** di `tema`, `paket_aset`, `kelas_bermain`, `video` (0060; default true = longgar).
- `pengaturan_menu.akses` jsonb `{admin:[key…], investor:[…], guru:[…]}` — menu admin per role, diatur super user (0063); `pengaturan_menu.fitur` menyimpan Akses Fitur admin/guru/psikolog (0067).

### Chat Psikolog (0064–0067, 0072, 0073, 0087)
| Tabel | Isi |
|---|---|
| `jadwal_psikolog` | satu baris per psikolog: `hari_buka int[]` (0=Minggu), `jam_mulai`/`jam_selesai`, `maks_per_hari`, `durasi_menit` (0072), `aktif`, `nama` (denormalisasi — customer tak boleh baca `profiles` psikolog) |
| `pendaftaran_konsultasi` | kontainer sesi: ortu, psikolog, anak (+`anak_nama` denormalisasi), `tanggal`, `jam` (0073), `keluhan`, `status` menunggu/diterima/ditolak/selesai/batal, `dimulai_pada`+`durasi_menit` (0072 → hitung mundur & auto-selesai) |
| `pesan_konsultasi` | pesan chat (pengirim, teks, `dibaca_at`) |
| `rekomendasi_psikolog` | rekomendasi naratif + `butir` jsonb `[{judul, isi}]` |
| `rekomendasi_item` | rekomendasi **produk/event/materi** untuk seorang anak (0067; bisa dari psikolog maupun guru) |
| `psikolog_profil` | master profil yang dikelola admin (0087): nama bergelar, badge, spesialisasi, foto, pendidikan S1 & profesi, no. STR, pengalaman. **Tabel terpisah dari `profiles`** karena datanya publik-ke-customer sedangkan `profiles` tidak |
RLS 0066: psikolog boleh membaca laporan tumbuh kembang anak **ter-scope** pada anak yang punya booking diterima/selesai dengannya.

### Master data & lain-lain (0078, 0079, 0082–0086)
`fokus_area` (key stabil + label ber-emoji, dipakai form Ide Bermain) · `kategori_usia` (dipakai form Game; range di-snapshot ke `paket_aset.usia_min/max`) · atribusi share (`ref_sumber`/`ref_saluran`/`ref_jenis` di `pendaftaran_event`, 0082) · `voucher` + `voucher_redeem` (0084; tipe nominal|persen, kuota total & per user, berlaku event/produk; kolom `voucher_id`/`potongan_voucher` di `pendaftaran_event` & `pesanan`).

**Urutan migrasi:** … → 0019 store → 0020 catatan perkembangan (+is_guru) → 0021 reminder → 0022 katalog baca anon → 0023 profil alamat → 0024 anak jenis_kelamin → 0025 mesin mewarnai → **0026 sertifikat** (kolom `event.sertifikat_bg_url`/`dokumentasi_url`, `pendaftaran_event.hadir_anak_ids`, tabel `sertifikat`) → **0027 reschedule** (`pendaftaran_event.event_asal_id`/`alasan_reschedule`) → **0028 postingan topik** (`postingan.topik`) → 0029–0032 mesin `dekode`/`urutan`/`jalur`/`hitung` → 0033 timer & mode tantangan → 0034 stiker nama → 0035–0037 mesin `cocokkan`/`ejakata`/`garis` → 0038 master pengaturan pembayaran → **0039 index performa** & **0040 RPC laporan** → 0041 artikel/blog → **0042 gamifikasi** (streak, lencana, tantangan) → 0043 panel gamifikasi admin → 0044 tantangan kustom → 0046 log aktivitas & analitik → 0047/0048 feedback → 0049/0050 diskon & berat produk → **0052 keuangan** → 0053 kategori aset → 0054 anggaran → 0055 kategori pengeluaran → **0056 super user** → 0057 counter terjual → **0058 sponsor** → 0059–0061 pembatasan trial → 0062 penilaian perkembangan → **0063 akses menu per role** → **0064–0067 psikolog & konsultasi** → 0068 ortu baca event terarsip → 0069 event 2 kelas → 0070 pendamping → 0071 nama panggilan → 0072/0073 durasi & jam konsultasi → 0074 mesin calistung → 0075 alasan tolak → 0076/0077 tujuan+usia & fokus/peran ortu → 0078/0079 master fokus area & kategori usia → 0080 mesin ingatan → 0081 katalog anon tema → 0082 atribusi share → 0083 sampul kelas → **0084 voucher** → 0085 pesan reminder per event → **0086 kuota event** → 0087 profil psikolog → **0088 transaksi per event** → **0089 paket langganan** (`paket_langganan` master + `langganan_anak` per anak + backfill member aktif ke Preschool, `kelas_bermain.worksheet_terbuka`, `event/produk.diskon_paket`, `pengaturan_trial.trial_hari`/`trial_paket_id`) → **0090 tagihan langganan** (`tagihan_langganan` + item per anak, trigger pelindung kolom uang, `voucher.berlaku_langganan`, CHECK `voucher_redeem.ref_tipe` += `langganan`) → **0091 kuota worksheet** (`paket_langganan.worksheet_kuota_*`, tabel `unduhan_worksheet`) → **0092 konsultasi bayar-per-sesi** (tarif per psikolog, kolom uang di `pendaftaran_konsultasi`, status `menunggu_bayar`, trigger pelindung, RPC `daftar_konsultasi` menghitung harga/diskon/kuota/voucher di SQL) → **0093 kegiatan anak** (`kegiatan_anak`: Ide Bermain & video per ANAK, dasar rapor bulanan) → **0094 batas hari WIB** (fungsi `hari_ini_wib()`; RPC konsultasi menilai keanggotaan & masa voucher memakai tanggal WIB, bukan `current_date` UTC).

---

## 8. Struktur Folder & Berkas (utama)

### `src/lib/`
- `supabase/{client,server}.ts`; `api/helpers.ts` (amplop JSON + auth Bearer REST API); `game/tipe.ts` (semua interface incl. `Produk`, `Pesanan`, `EventKelas`, `CatatanPerkembangan`, `SkalaPaud`, `Sertifikat`, `KelasBermain`).
- `domain/*` — **logika murni & teruji** (`npm test`: **97 unit test** di `src/lib/**/__tests__`): `trial`, `gamifikasi`, `harga`, `jadwal`, `laporan`, `laporan-anak`, `reminder`, `skor`, `usia`, `anak`, `voucher`, `waktu`, `tantangan-kustom`, **`stiker`** (ukuran font nama).
- **Kartu berbagi (canvas, tanpa dependency):** `kartu-bersama.ts` (palet, pembungkus teks `ukuranPas`, pemuat aset, ornamen) dipakai `story-card.ts` (1080×1920 IG Story) & `feed-card.ts` (1080×1080 IG Feed); `sertifikat-jpeg.ts` memakai helper yang sama untuk e-sertifikat **A4 landscape 3508×2480**.
- Lain-lain: `format.ts` (`formatTanggal`, `formatRupiah`, `STATUS_PESANAN`, `ASPEK_PAUD`/`SKALA_PAUD`, `nomorWaIntl`/`linkWa`), `menu-admin.ts` (katalog menu + matriks akses per role), `form-reset.ts` (`usePadaResetForm`), `img.ts` (kompresi unggahan), `share.ts`/`ref.ts` (atribusi share), `slug.ts`, `youtube.ts`, `tts.ts`, `metode.ts`, `profil.ts`.

### `src/lib/data/`
| Berkas | Isi |
|---|---|
| `kelas-bermain*.ts`, `favorit*.ts`, `riwayat-kelas.ts`/`riwayat-actions.ts` | kelas, favorit, riwayat |
| `event.ts` (+`getEventDiikuti`,`getStatusPendaftaranSaya`)/`event-actions.ts`, `admin-event*.ts` | event + pendaftaran + admin |
| `store.ts`,`keranjang*.ts`,`pesanan*.ts`,`admin-store*.ts` | Store (produk/keranjang/pesanan) |
| **`guru.ts`** (getGuruTerjamin, getEventUntukGuru, getPesertaEvent) / **`guru-actions.ts`** (simpanCatatan) | area guru |
| **`catatan.ts`** (getCatatanAnak, getCatatanEventSaya, getEventBerCatatan) | catatan sisi ortu |
| **`admin-guru.ts`/`admin-guru-actions.ts`** (jadikan/cabut guru) | kelola guru |
| **`admin-reminder.ts`/`admin-reminder-actions.ts`** (getReminderPendaftaran, tandaiReminder) | reminder WA |
| `keuangan.ts`/`keuangan-actions.ts`, **`ledger.ts`** (`catatLedger`/`hapusLedgerRef`), `anggaran*.ts`, `kpi.ts`, `investor.ts` | modul Keuangan + dashboard investor |
| `sponsor.ts`/`sponsor-actions.ts` | sponsor & deal sponsorship (invoice, pembayaran) |
| `konsultasi.ts`/`konsultasi-actions.ts`, `psikolog*.ts`, `psikolog-profil.ts`, `rekomendasi-item*.ts` | Chat Psikolog: jadwal, booking, chat, rekomendasi, master profil |
| `pengaturan-menu.ts`, `pengaturan-trial.ts`, `admin-users*.ts` | akses menu per role, pembatasan trial, kelola user & role |
| `artikel.ts`/`artikel-admin.ts`, `aktivitas*.ts`, `atribusi.ts`, `feedback*.ts` | blog, log aktivitas & analitik, atribusi share, masukan |
| `voucher.ts`/`voucher-actions.ts`, `kuota-event.ts`, `langganan-status.ts`, `pengaturan-bayar.ts` | voucher, kuota event, status langganan, master pembayaran |
| `fokus-area*.ts`, `kategori-usia*.ts`, `tantangan-kustom*.ts`, `admin-anak*.ts`, `admin-konten.ts` | master data & panel konten |
| `sertifikat.ts`/`admin-sertifikat-actions.ts`, `publik.ts` (cached), `pustaka.ts`, `skor*.ts`, `gamifikasi.ts` | sertifikat, katalog ter-cache, pustaka game, skor & gamifikasi |

### `src/components/`
Pewi, Confetti, game/* (15 mesin + `GameRunner`), FavoritBtn, BeliBtn, UnduhPdfBtn, EventCard/EventCarousel, ProdukCard, TambahKeranjangBtn, BottomNav (badge keranjang), **CatatanCard**/`NilaiPerkembanganForm` (rubrik & penilaian), **Logo**, **SertifikatView** + **UnduhSertifikatBtn** (JPEG A4), **StikerSheet** (lembar stiker cetak), **YoutubeEmbed**, **ShareButton** (kartu IG Story/Feed), **InputRupiah**/**UploadNota**/**InputSandi** (form), **LaporanAnakView** (rapor, dipakai ortu & psikolog), **ChatKonsultasi**, **Terkunci** (layar konten terkunci trial).

### `src/app/` — rute (yang baru ditandai ✦)
| Rute | Untuk |
|---|---|
| `/`, `/daftar`, `/login`, `/lupa-sandi`, `/reset-sandi` | Landing + Auth (+Lupa Password). Pakai **Logo**. |
| `/pilih-anak` | Dashboard ortu (sapaan, Favoritmu, carousel Event) + BottomNav |
| `/favorit`, `/kelas/[id]` | Favorit + detail kelas (Unduh PDF, 🛒 Beli) |
| ✦ `/kelas-saya` | Menu 🎈 **Ide Bermain** (dulu "Kelas Bermain" — label tampilan saja, rute & tabel `kelas_bermain` tetap): **event yang diikuti + Catatan Perkembangan**, lalu riwayat materi |
| `/main/[anakId]`, `/ortu/[anakId]` | Mode Anak / Mode Ortu |
| `/anak/[anakId]`(+`/laporan`) | Kelola anak + **Rapor** (termasuk Catatan Perkembangan) |
| `/pengaturan`, `/komunitas`(+`/[postId]`) | Akun + Forum |
| `/event`(+`/[id]/daftar`) | Event + pendaftaran (badge status, ✦ tombol 📋 Catatan) |
| ✦ `/catatan/[eventId]` | Ortu lihat Catatan Perkembangan anaknya di satu event |
| `/store`(+`/[id]`), `/keranjang`, `/pesanan`(+`/[id]`) | Toko + keranjang + pesanan |
| ✦ `/guru`(+`/[eventId]`) | **Area Guru**: pilih event → isi rubrik catatan per anak |
| `/artikel`(+`/[slug]`) | Blog/artikel publik (SEO, tombol Bagikan → kartu IG Story/Feed) |
| `/coba/kelas/[id]`, `/coba/tema/[id]` | Halaman teaser publik (boleh dibaca anon, migrasi 0081) |
| `/konsultasi`(+`/[pendaftaranId]`) | **Chat Psikolog** sisi ortu: daftar psikolog + booking + ruang chat |
| `/psikolog`(+`/[pendaftaranId]`, `/jadwal`) | **Area Psikolog**: antrian booking, chat, rekomendasi, atur jadwal & durasi |
| `/sertifikat/[id]` | E-sertifikat (tampil + unduh **JPEG A4 landscape**) |
| `/stiker-event/[id]`, `/admin/event/[id]/cetak-peserta` | Lembar stiker nama & daftar peserta siap cetak/PDF |
| `/investor` | Dashboard investor (ringkasan keuangan, `noindex`) |
| `/admin` + sub | Dashboard admin. Menu: analitik, event (+Pendaftar: absensi/sertifikat/reschedule/pindah kelas/cetak), produk, pesanan, **voucher**, ide bermain, fokus area, kategori usia, artikel, video, langganan, **keuangan** (transaksi, expense, anggaran, aset, pajak, KPI, insight, laporan, master), **sponsor**, anak, tantangan, pembayaran, trial, laporan, komunitas, masukan, **guru**, **psikolog**, pengguna, **reminder**, **akses menu**. **Nav utama persisten + tombol Back** (`AdminNav`); menu yang tampil difilter per role dari `pengaturan_menu` dan ditegakkan ulang di `proxy.ts`. |

`globals.css` (+`@media print .no-print`), `layout.tsx` (metadata + **favicon `/logo.png`**), `proxy.ts`.

---

## 9. Alur Fitur (FE ↔ BE)

**Auth:** daftar (Nama+WA) → trial. Login: jika **`is_guru`** → diarahkan ke `/guru`, selain itu `/pilih-anak`. Lupa password via `/lupa-sandi` → `/reset-sandi`.

**Favorit / Kelas Bermain:** materi dibuka → tercatat di riwayat; favorit (❤️) per akun. Bahan bisa terhubung **produk Store internal** (🛒 Beli → /store) atau link luar.

**Event:** admin buat → carousel/`/event` → user daftar (pilih anak, total server, bukti) → admin Terima/Tolak → badge status.

**Store:** katalog → keranjang (badge) → checkout (alamat) → admin set ongkir → user bayar+bukti → admin verifikasi (stok−) → resi → selesai.

**Catatan Perkembangan Bermain (Guru):**
```
Admin → Kelola Guru (aktifkan guru by email)
Guru login → /guru → pilih event → peserta (pendaftaran "diterima")
   → isi rubrik 4 aspek (BB/MB/BSH/BSB) + catatan → Simpan
Ortu → lihat di /kelas-saya & /event (📋 Catatan) & Rapor anak
```

**Reminder WA Event (semi-otomatis):** Admin → 📣 Reminder → semua event (BESOK disorot) → tiap peserta "💬 Kirim WA" (link `wa.me` + pesan H-1 siap kirim) → "tandai terkirim". Ada **filter cari nama event**. Nomor dirapikan ke `62…`.

**Chat Psikolog:** psikolog atur jadwal (hari, jam, kuota/hari, durasi sesi) → ortu pilih psikolog (profil dari master `psikolog_profil`) & booking tanggal+jam (RPC memvalidasi hari, jam, dan kuota) → admin/psikolog terima → psikolog tekan **Mulai** (hitung mundur berjalan sinkron di kedua sisi; habis → sesi `selesai` otomatis) → psikolog menulis rekomendasi + merekomendasikan produk/event/materi → semuanya tampil di Rapor anak.

**Keuangan (basis kas):** semua pendapatan masuk `transaksi_keuangan` lewat `catatLedger` pada satu titik per sumber — pendaftaran event **diterima**, pesanan **diverifikasi**, langganan **diaktifkan**, sponsorship **dibayar**. Unik `(ref_tipe, ref_id)` mencegah pencatatan ganda; pembatalan memanggil `hapusLedgerRef`. Pengeluaran diinput manual (boleh dikaitkan ke sebuah event, 0088) → laporan L/R, anggaran vs realisasi, KPI, dan dashboard investor semuanya membaca ledger yang sama.

**Voucher:** kode dinilai di server saat checkout/pendaftaran (tipe nominal/persen, kuota total & per user, rentang tanggal, berlaku event/produk) → potongan disimpan di `pendaftaran_event`/`pesanan` + baris `voucher_redeem`.

**Pembatasan trial:** status langganan (`aktif`/`trial`/`tenggang`/`kadaluarsa`) **tidak memblokir halaman** — ia hanya menyalakan flag `batasi`, dan item yang tak ditandai `boleh_trial` tampil 🔒 dengan ajakan perpanjang.

**Bottom Nav (7 tab):** 🏠 Beranda · 🎈 Ide · 🛒 Store (badge keranjang) · 📦 Pesanan · 💬 Komunitas · 🧠 Konsultasi · 👤 Akun.

---

## 10. Keamanan

1. **RLS tiap tabel.** 2. Guard kode (`getAnakTerjamin`, `getAdminTerjamin`, `getGuruTerjamin`, `adminDb`, filter `.eq(..user.id)`).
   - `getAnakTerjamin` memeriksa **login + kepemilikan anak saja**; status langganan **bukan** gerbang halaman, melainkan hanya mengunci konten per item (🔒). Sebelumnya ia memantulkan diam-diam ke `/pilih-anak` dan itu terbaca sebagai "tombol rusak" — lihat `DEVELOPER-KIDZPLAYFUL.md` §3 "Redirect harus membawa alasan".
3. **Fungsi SQL `is_superuser()`/`is_admin()`/`is_guru()`/`is_investor()`/`is_psikolog()` + trigger `cegah_self_admin`** — tak seorang pun bisa mempromosikan dirinya sendiri; `is_superuser` hanya lewat SQL Editor, role lain lewat halaman admin.
3b. **Akses menu admin per role** (`pengaturan_menu`, 0063) ditegakkan **dua lapis**: `admin/layout.tsx` menyembunyikan menu yang tak diizinkan, dan `proxy.ts` (middleware) memblokir bila rutenya diketik langsung. Menu sensitif (keuangan, pengguna, pembayaran, trial, sponsor) default **hanya super user**.
3c. **Data psikolog ter-scope** (0066): psikolog hanya bisa membaca laporan anak yang punya booking diterima/selesai dengannya — bukan seluruh anak.
4. Total event/pesanan dihitung server; harga di-snapshot. Stok berkurang saat verifikasi.
5. Upload user dibatasi folder `bukti/`. 6. Catatan: ortu hanya lihat catatan anaknya; guru hanya baca pendaftaran + tulis catatan.

---

## 11. Testing & Verifikasi

- Unit: `npm test` (**97 tes**, vitest). E2E: `npm run e2e`. Gerbang sebelum commit: `npx tsc --noEmit` → `npx eslint` → `npm test` → `npm run build`.
- Skrip verifikasi prod (`tools/*.mjs`): `event_m14_full.mjs`, `store_m16_check.mjs`, `catatan_m17_check.mjs`, dll. (`node tools/<nama>.mjs`).

---

## 12. Deploy — Supabase

1. Buat proyek. 2. **SQL Editor** → migrasi `0001`–`0088` berurutan (semua manual; verifikasi tiap kolom baru via REST `?select=<kolom>&limit=1` → 200). 3. Auth: matikan Confirm email (dev) / atur **SMTP** (agar reset password terkirim) + **Redirect URL** `https://<domain>/reset-sandi` + Site URL. 4. API → salin URL + publishable key ke env Vercel & lokal. 5. Admin (sekali): `update public.profiles set is_admin=true where email='…';` Guru diaktifkan dari Admin → Kelola Guru. 6. Bucket `aset` (0007) + izin bukti (0017).

## 13. Deploy — Vercel

Push GitHub → Import (Next.js) → isi 2 env var **sebelum** Deploy → tiap `git push master` auto-deploy. Plan **Hobby**: repo **public**. PowerShell: `&&` tak berlaku — pakai `;` atau baris terpisah.

---

## 14. Masalah & Solusi (ringkas)

| Masalah | Solusi |
|---|---|
| Deploy "Blocked" (Hobby+private) — **gejalanya SENYAP**: `git push` tetap sukses, CI hijau, tak ada error; fitur baru sekadar tidak pernah muncul (pernah 5 hari) | Repo dibuat public **atau** naik Vercel Pro. Setelah itu Vercel TIDAK otomatis membangun commit yang masuk saat privat → picu dengan commit kosong / Redeploy. Diagnosis lengkap: `docs/RUNBOOK-OPERASIONAL.md` RB-10 |
| Login admin ke /pilih-anak | Filter `.eq('id',user.id)` di query |
| Self-promote admin/guru | Trigger `cegah_self_admin` (0012/0020) |
| Migrasi 0016 `subquery in transform` | Konversi bahan via kolom sementara + UPDATE |
| Input link YouTube ditolak | Ekstraksi dukung shorts/live/format lain |
| Menu Kelas Bermain kosong (event ≠ materi) | `/kelas-saya` kini tampilkan event yang diikuti + catatan |
| Field tak ter-reset setelah simpan (nominal, kategori, **foto nota ikut ter-submit ke entri berikutnya**) | React 19 hanya mereset field **uncontrolled** pada `<form action={serverAction}>`. `InputRupiah`/`UploadNota`/`BudgetKategoriSelect` dibuat uncontrolled + hook `usePadaResetForm` (`lib/form-reset.ts`) untuk state tampilan |
| Fitur baru mematikan halaman yang tadinya jalan setelah deploy | Kode ter-deploy lebih dulu daripada migrasi manual sehingga kolom baru memicu `42703`. **Kolom baru wajib toleran**: query terpisah + nilai default, write retry tanpa kolom itu |
| Mesin game baru: INSERT paket ditolak DB (error ter-redact di production) | Perluas CHECK `paket_aset_mesin_check` lewat migrasi (pola 0025…0037, 0074, 0080) |
| Klik profil anak tidak membuka halaman anak | Guard memantulkan **diam-diam** saat langganan tak aktif / baris `langganan` hilang-ganda. Gerbang dicabut; akses dibatasi lewat kunci per konten, dan setiap `redirect()` wajib membawa alasan yang ditampilkan |
| Dokumentasi & e-sertifikat hilang dari Rapor setelah event diarsipkan | Blok event kini juga lahir dari **kehadiran**, dan judul/tanggal/dokumentasi dibaca live dari `event` (snapshot cadangan). Policy 0068 yang mengizinkannya sudah ada sejak lama |
| Pencarian di daftar admin "seolah datanya tidak ada" | Daftar dipaginasi sehingga pencarian **harus server-side**. Kata kunci disanitasi sebelum masuk filter PostgREST `or=(...)` |
| Stiker terpotong di batas halaman | Chrome mengabaikan `break-inside: avoid` pada grid item, jadi stiker dipotong sendiri per 10 + `break-after: page` |

---

## 15b. Fitur & Peningkatan Terbaru

### Game Mewarnai (engine `mesin: 'mewarnai'`)
- **Tap-area**: gambar SVG ber-area, pilih warna dari palet → tap area → terisi. Nama warna disuarakan (TTS), tombol Ulang.
- **Sumber gambar**: (a) **template bawaan** (Apel/Rumah/Ikan/Balon/Bunga) di `src/lib/game/templates-mewarnai.ts`; (b) **admin upload SVG** sendiri — disanitasi (`src/lib/game/svg-sanitize.ts`: buang script/on*/href) & diberi `data-area`.
- **Mode**: **Bebas** (bintang saat selesai) / **Sesuai contoh** (skor kecocokan warna vs target; ada mini "contoh").
- Berkas: `components/game/MewarnaiGame.tsx`, admin `TargetEditor.tsx` (atur warna target per area utk SVG upload). Dibuat admin lewat PaketForm (mesin Mewarnai). Skor via `catatHasil`; area skill **`kreativitas`** (muncul di Rapor).

### REST API untuk aplikasi mobile (Flutter)
- Route Handlers di `src/app/api/**`; auth **Bearer token** (`src/lib/api/helpers.ts`), RLS tetap berlaku. Respons `{ok,data|error}`.
- Endpoint: `/api/auth/{login,register,refresh}`, `/api/me`, `/api/anak`(+`/[id]/catatan`), `/api/kelas-bermain`(+`/[id]`), `/api/events`(+`/[id]`,`/[id]/daftar`), `/api/produk`(+`/[id]`), `/api/keranjang`, `/api/pesanan`(+`/[id]`). Kontrak: **`docs/API-MOBILE.md`**.

### Performa (web terasa jauh lebih ringan)
- **Region Vercel `bom1`** co-located dgn Supabase `ap-south-1` (`vercel.json`) — pemangkas latensi terbesar.
- Middleware lewati `/api` & aset; **query paralel** (`Promise.all`) di halaman berat; **cache katalog** publik 60 dtk (`src/lib/data/publik.ts` + `unstable_cache`, butuh baca anon 0022); **`next/image`** untuk gambar Supabase.

### Lain-lain hari ini
- **Domain kustom** `www.kidzplayful.com` (DNS DomaiNesia → Vercel; Supabase Auth Site/Redirect URL diperbarui). `metadataBase` di `layout.tsx`.
- **Logo** brand (`public/logo.png` + `components/Logo.tsx`) di landing/auth/Mode Anak + favicon.
- **Store checkout auto-isi** (nama/no HP/alamat dari profil) + halaman **Akun → Data Pengiriman** (`ProfilPengirimanForm`, kolom `profiles.alamat`).
- **Anak**: jenis kelamin (👦/👧) + form Tambah Anak jadi **collapse** (`<details>`); perbaikan tampilan input tanggal iOS.
- **Kategori produk** jadi dropdown. Fix bug game "Mana Ya" (reset tombol tiap ganti soal).

---

## 15c. Fitur & Peningkatan (2026-07-02)

### E-Sertifikat Kelas Bermain (Event) — migrasi 0026
- **Absensi kehadiran per anak**: di halaman Pendaftar event (admin) tiap anak (pada pendaftaran *diterima*) punya tombol **Hadir** → tersimpan di `pendaftaran_event.hadir_anak_ids uuid[]`. Ada **badge "N anak hadir"** di pojok kanan atas (live).
- **Template & dokumentasi per event**: kolom baru `event.sertifikat_bg_url` (gambar template JPEG) & `event.dokumentasi_url` (link). Di-upload/diisi lewat panel **🏅 Sertifikat & Dokumentasi** pada kartu event. Saat template di-upload / link disimpan → **auto-generate** sertifikat untuk semua anak *hadir*.
- **Tabel `sertifikat`** (snapshot: `anak_nama, event_judul, event_tanggal, lokasi, bg_url, dokumentasi_url, diterbitkan_oleh`; `unique(event_id,anak_id)`; RLS: ortu baca miliknya / admin kelola). Generate = **upsert idempoten** (`generateSertifikatEvent`).
- **Sisi user**: halaman `/sertifikat/[id]` (`components/SertifikatView.tsx`) — desain landscape, **teks apresiasi di-overlay di atas template JPEG** (fallback desain pastel + Logo bila belum ada template), tombol **Unduh PDF** (cetak A4 landscape). Muncul di **Rapor anak** + tombol unduh per anak di halaman Pendaftar admin.
- Berkas: `lib/data/sertifikat.ts` (baca), `lib/data/admin-sertifikat-actions.ts` (`generateSertifikatEvent`,`hapusSertifikat`), `components/SertifikatView.tsx`, `app/sertifikat/[id]/page.tsx`.

### Reschedule pendaftaran — migrasi 0027
Tombol **🔁 Reschedule** di kartu Pendaftar → pilih **event aktif** tujuan + **alasan** (mis. anak sakit H-1). `reschedulePendaftaran` memindahkan `event_id` (pembayaran/bukti/status ikut, absensi direset) dan mencatat `event_asal_id` + `alasan_reschedule`. Event tujuan menampilkan catatan "🔁 Direschedule: {alasan}".

### Pendaftaran event per-anak (multi-anak)
- `getPesertaPerEvent()` → per event: daftar **{nama, status}** anak yang terdaftar (kecuali *ditolak*).
- **Kartu event** kini menampilkan **"Anak terdaftar"** (nama + status per anak) + tombol **"➕ Daftarkan anak lainnya (N)"** selama masih ada anak belum terdaftar. Halaman daftar hanya menampilkan anak yang belum terdaftar; `daftarEvent` menolak/membuang anak yang sudah terdaftar (cegah duplikat).

### Rapor anak — daftar per-event (collapse)
Section catatan & sertifikat digabung menjadi satu daftar **collapse** (`<details>`) per event (ringkas saat anak ikut banyak event); dibuka → detail (sertifikat, dokumentasi, kartu catatan).

### Rapor bulanan yang bisa diunduh — `/anak/[anakId]/rapor/[ym]` (migrasi 0093)
Inti janji "preschool homeschooling": tiap anak punya **rapor per bulan**, bukan cuma statistik game.

- **Aktivitas mandiri tercatat per ANAK** (tabel `kegiatan_anak`): Ide Bermain yang dibuka dan video yang ditonton di Mode Anak. Judulnya di-**snapshot**, jadi rapor lama tetap terbaca walau materinya nanti diubah atau dihapus.
- **Isi rapor**: Ide Bermain & video (daftar + jumlah pengulangan), sesi game/bintang/menit + area yang paling dilatih, kelas bermain yang diikuti, **catatan perkembangan penuh** dari guru pada event bulan itu (per indikator: `Area: Indikator — BB/MB/BSH/BSB` + catatan bebasnya), dan **hasil konsultasi psikolog**: rekomendasi naratif plus **produk, event, dan ide bermain** yang direkomendasikan psikolog. Rekomendasi difilter menurut bulan rapornya.
- **Unduh JPEG A4 landscape** (1 halaman, siap dicetak/di-share ke keluarga) — mesin kanvas yang sama dengan e-sertifikat, tanpa aplikasi tambahan.
- **Haknya `rapor_bulanan` mengikuti paket ANAK itu** (diatur admin di `/admin/paket`). Anak di paket tanpa hak ini tetap melihat Rapor berjalan; hanya berkas bulanannya yang terkunci.
- Tombol kembali di halaman rapor **selalu** mengarah ke halaman **Perkembangan** anak (bukan riwayat browser) — karena halaman itu punya deretan chip bulan.

### Pesanan admin — koreksi ongkir
Field ongkir juga muncul saat status **`menunggu_bayar`** (nilai terisi otomatis) → admin bisa memperbaiki ongkir sebelum user bayar; total user ter-recompute. `setOngkir` `revalidatePath('/pesanan')`.

### Navigasi Admin persisten + tombol Back
`src/app/admin/AdminNav.tsx` (client) dirender di `admin/layout.tsx`: **menu utama selalu tampil di semua halaman** & menandai halaman aktif, plus tombol **"← Kembali"** (`router.back()`) otomatis di tiap sub-halaman. Grid menu di dashboard & link "← dashboard" inline per halaman dihapus (tak dobel).

### Materi Kelas Bermain — embed YouTube inline
Link YouTube pada `link_ide` kini tampil sebagai **iframe embed** (`youtube-nocookie`, 16:9) — seperti pojok video — bukan tautan keluar. Util `src/lib/youtube.ts` (`youtubeId`) + komponen `src/components/YoutubeEmbed.tsx`. Non-YouTube tetap jadi tombol "Lihat ide". Dipakai di `/kelas/[id]`, Mode Anak, Mode Ortu.

### Komunitas — topik dari judul materi/event/game — migrasi 0028
Kolom baru `postingan.topik` (teks bebas) menggantikan pemakaian `tema_id` sebagai topik. Opsi topik (datalist di `Compose`) = gabungan **judul Kelas Bermain (aktif) + Event (tampil) + Game/paket (disetujui)** via `getTopikOptions()`. Tombol **"💬 Bagikan pengalaman"** dari halaman materi membawa `?topik=<judul>` → form komunitas terisi otomatis.

### Analytics
- **Dashboard Admin** `/admin/analitik` (`app/admin/analitik/page.tsx`): **DAU/WAU/MAU** akun ortu, total akun/anak, **aktivitas 30 hari** (sesi main, pendaftaran, pesanan, postingan, komentar), **game terpopuler** & **ortu teraktif** — dihitung dari data Supabase (admin baca lintas user via RLS migrasi 0006). Tanpa pihak ketiga → privat.
- **Vercel Web Analytics**: `@vercel/analytics` `<Analytics/>` di `layout.tsx` untuk traffic pengunjung (aktifkan **Web Analytics** di dashboard Vercel).

### Branding
Logo baru **berlatar transparan**; `components/Logo.tsx` default `plate=false` (tanpa kotak hitam). Favicon tetap `/logo.png`.

---

## 15d. Referensi Engine Game (terperinci)

Semua game **data-driven**: 1 `mesin` (engine/komponen) + `butir` (data soal, jsonb). Menambah engine = `tipe.ts` (union `Mesin` + interface `DataX`) → `butir.ts` (normalisasi+validasi) → komponen `components/game/*.tsx` → `GameRunner.tsx` (dispatch) → `PaketForm.tsx` (form admin + `AREA`) → migrasi ALTER CHECK `paket_aset_mesin_check`.

### Alur & fungsi bersama (semua engine)
- **Kontrak komponen**: `export default function X({ data, onSelesai }: { data: DataX; onSelesai: (h: HasilSelesai) => void })`. Tiap engine menghitung sendiri `{ benar, total, durasiDetik }` lalu memanggil `onSelesai(...)`. Skor **first-try** (benar dihitung bila tak ada kesalahan sebelum jawaban benar).
- **`GameRunner.tsx`** (`src/components/game/`): pembungkus semua game. `useEffect` timer hidup (⏱, berhenti saat selesai); `selesai(h)` → `catatHasil({..,targetDetik})` → `onKoin`; render `<Reward>` (hitung bonus cepat: `durasiDetik ≤ target` ⇒ +1 bintang maks 3 + badge ⚡) dan dispatch `if (paket.mesin===…) engine = <…/>`.
- **`butir.ts`** (`src/lib/game/`): `butirDariForm(mesin,form)` (normalisasi) & `validasiButir(mesin,butir)` (pesan Indonesia; dipanggil di klien PaketForm & server `buatPaket/updatePaket`).
- **`skor.ts`** (`src/lib/data/`): `catatHasil({anakId,temaId,mesin,areaSkill,benar,total,durasiDetik,targetDetik?})` → tulis `hasil_main` + `bintang` (bonus bila di bawah target) + koin (`benar` + bonus). `hitungBintang` di `domain/skor.ts` (≥99%→3, ≥60%→2, else 1).
- **`pustaka.ts`** (`getPustaka`): baca `paket_aset` (`disetujui`) termasuk `target_detik`. Filter usia via `cocokUsia(umur, usia_min, usia_max)` di `PilihGame.tsx`.
- **`PaketForm.tsx`**: buat **& edit** paket (dropdown "Edit game yang ada" → hidrasi state dari `butir` per mesin), input usia & `⚡ target waktu`.
- **`paket_aset`** kolom: `mesin, judul, area_skill, usia_min, usia_max, target_detik, butir(jsonb), status, urutan`. CHECK `mesin` dibatasi (perlu migrasi tiap engine baru).
- Render aset per item pakai `components/game/Aset.tsx` (emoji/gambar-URL) atau helper lokal `Sim`/`SimbolMini` (tambah swatch utk `#hex`).

### 1. `tekan-sesuai` — "Mana Ya?" (kognitif)
Anak menekan jawaban benar dari beberapa pilihan (emoji/gambar). **butir** `DataTekan { soal: {tanya, benar, salah[]}[] }`. Komponen `ManaYa.tsx` (`pilih()`, TTS `speak`, `mix()` acak pilihan). Lembar buku: —.

### 2. `seret-wadah` — "Beres-Beres" (motorik-halus)
Seret benda ke wadah kategori yang tepat. **butir** `DataSeret { wadah:{kategori,label,emoji}[]; benda:{emoji,kategori}[] }`. Komponen `BeresBeres.tsx`.

### 3. `cari-pasangan` — "Cari Pasangan" (kognitif)
Buka kartu cari pasangan identik (memori). **butir** `DataCocok { pasangan: string[] }` (tiap entri digandakan). Komponen `CariPasangan.tsx`.

### 4. `mewarnai` — "Mewarnai" (kreativitas)
**butir** `DataMewarnai { sumber:'template'|'svg', template?, svg?, palette[], mode:'bebas'|'sesuai'|'berkode', target? }`. Komponen `MewarnaiGame.tsx`: `TemplateMode` (template bawaan) & `SvgMode` (SVG upload, `data-area` per shape). `PaletBar` (opsi `bernomor` utk berkode), `GambarTpl`. Mode: **bebas** (bintang saat selesai), **sesuai** (cocokkan warna target), **berkode / color-by-number** (tiap area diberi label angka = urutan warna target di `palette`, palet bernomor; skor jalur `sesuai`). Lembar: **12, 15**.

### 5. `dekode` — "Pecahkan Kode" (kognitif) — migrasi 0029
Legenda simbol→nilai; anak menerjemahkan sekuens simbol per posisi (tap nilai benar). **butir** `DataDekode { legenda:{simbol,nilai}[]; soal:string[][] }` (tiap soal = urutan simbol yang harus ada di legenda). Komponen `Dekode.tsx` (`tap()`, `Simbol` hex/emoji/gambar). Lembar: **4, 9, 10, 14, 20, 21, 22, 25, 26**.

### 6. `urutan` — "Urutan & Pola" (kognitif) — migrasi 0030
**butir** `DataUrutan { tipe:'urutkan'|'pola', soal: {urut[],petunjuk?} | {tampil[],benar,salah[]} }`. Komponen `UrutanGame.tsx`: `UrutkanMode` (item teracak, ketuk berurutan sesuai `urut`; ada `petunjuk`) & `PolaMode` (lanjutkan pola: pilih item berikutnya). Helper `acak()`. Lembar: **2, 16, 28, 30**.

### 7. `jalur` — "Arah & Jalur / Robot Grid" (kognitif) — migrasi 0031
Grid; anak menyusun **urutan perintah arah** (⬆️⬅️➡️⬇️) lalu **Jalan** → karakter berjalan (animasi) ke tujuan; keluar grid/kena rintangan = gagal. **butir** `DataJalur { soal:{kolom,baris,mulai[x,y],tujuan[x,y],rintangan[][],karakter,hadiah}[] }`. Komponen `JalurGame.tsx` (`jalan()` async `sleep`, `ARAH`). Editor admin: klik sel set mulai/tujuan/rintangan. Melatih *sequencing*. Lembar: **3, 7, 19, 29**.

### 8. `hitung` — "Hitung-Kode" (kognitif) — migrasi 0032
Legenda simbol→angka; soal `kiri {+/−} kanan = ?` → pilih hasil (pilihan angka auto-generate; − dijaga ≥0). **butir** `DataHitung { legenda:{simbol,nilai:number}[]; soal:{kiri,kanan,operasi:'+'|'-'}[] }`. Komponen `HitungGame.tsx` (`opsiAngka()`). Lembar: **1, 17, 18, 23**.

### 9. `cocokkan` — "Cocokkan / Asosiasi" (kognitif) — migrasi 0035
Dua kolom: ketuk item kiri lalu pasangannya di kanan (kanan diacak). **butir** `DataCocokkan { pasangan:{kiri,kanan}[] }`. Komponen `CocokkanGame.tsx` (`tapKanan()`, cocok→terkunci). Lembar: **8, 13, 27**.

### 10. `ejakata` — "Eja Kata" (kognitif) — migrasi 0036
Gambar/emoji petunjuk + slot huruf panduan; anak ketuk huruf berurutan dari tumpukan (acak + `pengecoh`) mengeja kata. **butir** `DataEjaKata { soal:{gambar?,kata,pengecoh?}[] }`. Komponen `EjaKataGame.tsx` (`tap()`, huruf di-uppercase). Lembar: **5**.

### 11. `garis` — "Titik & Garis" (motorik-halus) — migrasi 0037
Tampil contoh pola garis; anak ketuk **2 titik** pada grid untuk membuat garis, meniru contoh (dinilai otomatis via himpunan sisi). **butir** `DataGaris { soal:{kolom,baris,garis:[a,b][]}[] }` (indeks titik = `y*kolom+x`; sisi tak-berarah). Komponen `GarisGame.tsx` (`GridSVG`, `ek()` kunci sisi). Editor admin: klik 2 titik toggle garis. Lembar: **6, 24**.

> **Contoh siap-main** untuk seluruh engine koding ada di tema **"Contoh Koding"** (dibuat via REST admin). Menutup ~30 dari 30 lembar buku *Coding Anak TK*.

---

## 15e. Fitur & Peningkatan (2026-07-03)

### Timer & Mode Tantangan — migrasi 0033
- `durasi_detik` sudah diukur tiap engine; kini **timer ⏱ tampil live** saat main (di `GameRunner`) & **waktu selesai** di `Reward`.
- **Mode Tantangan**: kolom `paket_aset.target_detik` (opsional, diisi admin). Selesai **≤ target** → **+1 bintang (maks 3)** + **koin bonus** + badge **"⚡ Cepat! Bonus"** (dihitung di `catatHasil`). Timer bar menampilkan target.
- **Rapor anak**: `laporan-anak.ts` tambah `totalDetik/rataDetik/tercepatDetik` + `perMesin` → section **"⏱ Waktu per game"** (jumlah main + tercepat per jenis game) & baris "rata-rata/sesi · tercepat".

### Edit paket game
`updatePaket()` (`admin-konten.ts`) + dropdown **"Edit game yang ada"** di `PaketForm` → hidrasi form dari `butir` (semua engine) → **Simpan perubahan**. (Sebelumnya hanya buat & hapus.)

### Stiker Nama per event — migrasi 0034
Kolom `event.stiker_bg_url`. Panel event: **⬆ Template Stiker** + **🏷️ Cetak Stiker Nama** → halaman `/stiker-event/[id]` (`components/StikerSheet.tsx`): lembar **F4 berisi 10 stiker 9×6 cm** (grid 2×5), **nama anak + judul kelas** di atas template (atau desain pastel), untuk **semua anak yang DAFTAR** (bukan hadir). Tombol Unduh/Cetak PDF (`@page 215×330mm`).

### Urutan migrasi lanjutan
… → **0026** sertifikat (`event.sertifikat_bg_url`/`dokumentasi_url`, `pendaftaran_event.hadir_anak_ids`, tabel `sertifikat`) → **0027** reschedule (`event_asal_id`,`alasan_reschedule`) → **0028** postingan topik (`postingan.topik`) → **0029** mesin dekode → **0030** mesin urutan → **0031** mesin jalur → **0032** mesin hitung → **0033** `paket_aset.target_detik` → **0034** `event.stiker_bg_url` → **0035** mesin cocokkan → **0036** mesin ejakata → **0037** mesin garis → **0038** tabel `pengaturan_pembayaran` → **0039** index performa → **0040** RPC `laporan_engagement` + index `hasil_main` → **0041** tabel `artikel` (blog) → **0042** gamifikasi (`anak.streak`, `lencana_anak`, `tantangan_anak`) → **0043** RLS admin gamifikasi → **0044** `tantangan_kustom` + `hasil_main.paket_id` → **0045** `tantangan_kustom.usia_min/max` → **0046** tabel `aktivitas` → **0047** tabel `feedback` → **0048** `feedback.jawaban` jsonb. (0029–0037 mesin = ALTER CHECK `paket_aset_mesin_check`.)

---

## 15f. Fitur & Peningkatan (2026-07-04 s.d. 2026-07-06)

### Master Pengaturan Pembayaran (dinamis) — migrasi 0038
Harga langganan & nomor rekening tak lagi hardcode; kini master tunggal yang diedit admin.
- **Tabel `pengaturan_pembayaran`** (baris tunggal `id=1`): `harga_langganan_nominal`, `harga_langganan_teks`, `bank_teks`, `qris_url`, `wa_nomor`, `updated_at`. RLS: **baca** untuk semua user terautentikasi, **ubah** hanya `is_admin()`. Migrasi meng-`insert` baris default.
- **`lib/data/pengaturan-bayar.ts`**: `getPengaturanBayar()` (baca, dengan fallback `DEFAULT_BAYAR` bila tabel/baris belum ada → app tetap jalan) + tipe `PengaturanBayar`.
- **`lib/data/admin-bisnis.ts`**: `simpanPengaturanBayar(formData)` (`adminDb()` guard → update baris → `revalidatePath`).
- **Halaman admin `/admin/pengaturan-bayar`** (menu **💰 Pembayaran** di `AdminNav`): form edit harga (nominal + teks), rekening, URL QRIS, nomor WA.
- **Dipakai dinamis** di: `/pengaturan` (kartu Langganan member), `/pesanan/[id]` (instruksi transfer Toko), dan **default nominal** di `AktifkanForm` admin.

### Komunitas — perbaikan pemilih topik
`komunitas/Compose.tsx`: pemilih topik dari `<input list=datalist>` diganti **`<select>`** berisi seluruh opsi (judul Kelas Bermain + Event + Game) + opsi **"✏️ Ketik topik sendiri…"**. Memperbaiki bug datalist yang memfilter opsi oleh teks di kotak sehingga topik tak bisa diganti kecuali dihapus dulu. Auto-isi topik dari judul materi tetap jalan (masuk daftar → terpilih; di luar daftar → mode ketik sendiri).

### Optimasi performa — migrasi 0039 & 0040
Hasil scan performa (codebase sudah sehat: tak ada `select('*')`, caching & `next/image` terpasang). Perbaikan:
- **Migrasi 0039** — 11 index untuk kolom yang sering difilter: `pendaftaran_event(ortu_id|event_id|event_id,status)`, `pesanan(ortu_id)`, `item_pesanan(pesanan_id)`, `catatan_perkembangan(anak_id|ortu_id)`, `sertifikat(anak_id|ortu_id)`, `suka(ortu_id)`, partial `postingan(created_at desc) where status='tampil'`.
- **Migrasi 0040** — RPC `laporan_engagement()` (SECURITY DEFINER + guard `is_admin()`) menghitung agregasi `hasil_main` di DB (tak menarik semua baris ke app) + index `hasil_main(mesin|tema_id)`. Dipakai `/admin/laporan`.
- **Query paralel**: `anak/[anakId]/laporan` & `/admin/laporan` → `Promise.all`.
- **N+1 dihindari**: `verifikasiPesanan` ambil stok via `.in()` + update paralel.
- **Pagination admin**: komponen `admin/Pager.tsx`; `/admin/pesanan` (20/hal) & `/admin/langganan` (30/hal) via `?hal=N` + `range()`/`count:'exact'`. `getReminderPendaftaran` diberi cap `limit(500)`.
- **`next/image`**: keranjang & daftar event (dari `<img>`).

### SEO — landing page publik + metadata + structured data
Karena semua halaman internal redirect ke `/login` (tak bisa di-crawl), SEO difokuskan ke halaman depan `/`.
- **`app/page.tsx`** dirombak jadi **landing page publik** server-rendered (prerendered **static**): hero + H1 kaya kata kunci, fitur, tahap usia, FAQ, CTA, footer NAP. Aplikasi di balik login **tidak diubah**.
- **Metadata** (`app/layout.tsx`): `title.template`, `description`, `keywords`, `openGraph`, `twitter`, `robots` (index+follow, googleBot max-preview), `alternates.canonical`, `metadataBase`.
- **`app/robots.ts`** — allow `/`, disallow area privat (`/admin,/main,/anak,/ortu,/pengaturan,/pesanan,/store,/event,/komunitas,…`), tunjuk sitemap.
- **`app/sitemap.ts`** — URL publik (`/`, `/daftar`, `/login`).
- **`app/opengraph-image.tsx`** — OG image 1200×630 via `next/og` (mandiri, tanpa aset eksternal).
- **JSON-LD** di landing (`@graph`): `Organization`, `WebSite`, `LocalBusiness`+`ChildCare` (NAP), `FAQPage`. Helper `bersih()` membuang field kosong agar JSON-LD tidak berisi nilai kosong.
- **NAP** (`PROFIL` di `app/page.tsx`): telp **+6282233684933** + kota **Surabaya, Jawa Timur 60111** sudah diisi; `alamat`/`jamBuka`/`email` masih kosong (opsional, isi bila sudah ada — field kosong otomatis diabaikan).
- **Verifikasi Google Search Console**: `metadata.verification.google` di `app/layout.tsx` (tipe properti **URL prefix** `https://www.kidzplayful.com`, metode HTML tag). **Terverifikasi**, `sitemap.xml` sudah disubmit (Success). *Tipe properti "Domain" butuh DNS TXT — tidak dipakai.*
- **TODO manual**: buat **Google Business Profile** untuk kelas offline (SEO lokal/Maps) begitu alamat lengkap tersedia.

### Blog / Artikel publik — migrasi 0041
Halaman konten publik untuk memperkuat SEO (menambah halaman yang bisa di-crawl & diranking).
- **Tabel `artikel`** (`slug` unik, `judul`, `ringkasan`, `isi` markdown, `sampul_url`, `status` draf/terbit, `terbit_pada`). RLS: publik/anon baca yang `terbit`, admin kelola semua. Index `(status, terbit_pada desc)`.
- **Publik**: `/artikel` (daftar terbit) + `/artikel/[slug]` (detail, `generateMetadata` per-artikel + OpenGraph article + **JSON-LD BlogPosting**). Isi dirender oleh `components/ArtikelBody.tsx` — renderer markdown minimal **tanpa dependency & tanpa dangerouslySetInnerHTML** (aman): `##`/`###`, paragraf, `- list`, `**tebal**`, `[teks](url)`.
- **Admin** (menu **📝 Artikel**): `/admin/artikel` (tulis judul → draf → editor) + `/admin/artikel/[id]` (`ArtikelForm`: judul, slug auto, ringkasan, sampul upload ke bucket `aset`, isi, Simpan/Terbitkan/Draf/Hapus). Data: `lib/data/artikel.ts` (baca) + `lib/data/artikel-admin.ts` (CRUD, `'use server'`). `slugify` di `lib/slug.ts` (dipakai server & client).
- **Sitemap dinamis**: `app/sitemap.ts` kini async → menyertakan semua artikel terbit + `/artikel`.
- Link "Artikel" ditambahkan di header & footer landing.
- **Seed konten** `supabase/seed/artikel_awal.sql` — 6 artikel SEO awal (kelas bermain, screen time, sensorik-motorik, koding TK, rapor, memilih playgroup) status `terbit`, dollar-quoted, `on conflict (slug) do nothing`.
- **Kartu "📖 Artikel & Tips" di Beranda** (`/pilih-anak`): 3 artikel terbaru (`getArtikelTerbit({ limit: 3 })`) + link "Lihat semua" → `/artikel`. Tak ditaruh di `BottomNav` (sudah penuh 6 item).
- **Filter pencarian** di `/artikel`: form GET `?q=` → `getArtikelTerbit({ q })` (`ilike` judul/ringkasan, karakter pengganggu dibersihkan).
- **Halaman artikel sadar login** (`/artikel` & `/artikel/[slug]` cek `getUser()`): saat **sudah login**, CTA "Coba Gratis"/"Daftar Gratis" disembunyikan, logo + tombol mengarah ke `/pilih-anak`, dan detail menampilkan tombol "← Kembali ke daftar artikel". Pengunjung anonim tetap melihat CTA pemasaran.

### Halaman legal & publik (Roadmap Fase 0 #1)
Halaman statis publik (server-rendered, prerendered **static**) via route group `src/app/(legal)/` dengan `layout.tsx` bersama (header logo + footer link legal):
- `/kebijakan-privasi`, `/syarat-ketentuan`, `/tentang`, `/kontak`. Tiap halaman punya `metadata` (title/description/canonical) sendiri.
- Identitas & kontak di `lib/profil.ts` (`PROFIL`, `WA_LINK`, `LEGAL_DIPERBARUI`); pengelola = brand "KidzPlayful", kontak = WhatsApp **+62 822-3368-4933** (tanpa email). Gaya prosa bersama di `(legal)/gaya.ts`.
- Privasi disesuaikan data nyata app (akun ortu, profil anak, hasil main, bukti transfer manual, analitik anonim; akun dibuat orang tua/wali). Tautan legal ditambah di footer landing + `sitemap.xml`.

### Onboarding ortu baru (Roadmap Fase 0 #6)
Kartu **"🌱 Langkah Awal"** di Beranda (`/pilih-anak`) — `components/OnboardingChecklist.tsx` (server, data-driven, bukan flag palsu):
- 3 langkah: (1) Tambah profil anak, (2) Coba game pertama, (3) Aktifkan langganan — dengan progres `(N/3)` & centang.
- Sumber kebenaran: `adaAnak` (jumlah anak), `adaAktivitas` (count `hasil_main` via embedded `anak!inner(ortu_id)`), `statusAktif` (langganan). Langkah "coba game" terkunci 🔒 sampai ada anak; link ke `/main/[id]` atau `/pilih-game/[id]` sesuai `mode_default`.
- Kartu **hilang otomatis** saat aktivasi inti tercapai (ada anak **dan** pernah main). Langkah 1 menaut ke `#tambah-anak` (form tambah anak diberi anchor).

### Gamifikasi retensi: streak + lencana + tantangan harian — migrasi 0042 (Roadmap Fase 2 #10)
- **Migrasi 0042**: kolom `anak.streak` & `anak.streak_terakhir` (date); tabel `lencana_anak(anak_id,kode,didapat_pada)` & `tantangan_anak(anak_id,tanggal,kode,selesai)` (RLS: ortu kelola milik anaknya via `anak.ortu_id = auth.uid()`).
- **Logika murni** `lib/domain/gamifikasi.ts`: `tanggalWIB()` (kalender WIB), **8 lencana** (`LENCANA`+`evaluasiLencana`: pertama/rajin/juara/koin100/streak3/streak7/sempurna/penjelajah), **tantangan harian rotasi** (`TANTANGAN_POOL` 4 item, `tantanganHariIni` deterministik by tanggal, `progresTantangan`, `BONUS_TANTANGAN=5`).
- **`catatHasil`** (`lib/data/skor.ts`) diperluas: setelah insert `hasil_main`, hitung streak (main hari-ini setelah kemarin → +1; bolong → reset 1), progres tantangan (dari main hari ini) + bonus koin 1×/hari, dan lencana baru dari agregat. Dibungkus **try/catch** → bila migrasi 0042 belum ada, fallback ke koin dasar (main tetap jalan). Return diperkaya `{streak, lencanaBaru, tantangan}`.
- **Tampilan:** layar **Reward** (streak 🔥 / lencana baru 🏅 / tantangan selesai 🎯 dari nilai balik `catatHasil`), **Menu Anak** (chip streak + kartu tantangan hari ini + galeri lencana; live-update via `onGamifikasi`), **Rapor anak** (galeri 8 lencana + streak). Reader `lib/data/gamifikasi.ts` `getGamifikasiAnak()` (juga ber-fallback).

### Panel Gamifikasi Anak (admin) — migrasi 0043
Admin dapat mengatur streak, koin, dan lencana tiap anak (koreksi/apresiasi).
- **Migrasi 0043**: policy `admin update anak` + `admin kelola lencana` (`is_admin()`), melengkapi `admin baca anak` yang sudah ada (0006).
- **Halaman `/admin/anak`** (menu **🧒 Anak** di `AdminNav`): daftar anak (nama + email ortu) + `AnakGamiForm` (input streak & koin + Simpan; chip 8 lencana untuk beri/cabut). Data `lib/data/admin-anak.ts` (`getAnakUntukAdmin`, embed `ortu:ortu_id(email)`+`lencana_anak`) + `admin-anak-actions.ts` (`setStreakKoin` — juga patok `streak_terakhir=hari ini`; `toggleLencana`).

### Stok Tantangan Kustom (quest builder admin) — migrasi 0044
Admin membuat "stok" misi kustom yang berjalan berdampingan dengan gamifikasi otomatis.
- **Migrasi 0044**: `hasil_main.paket_id` (catat game spesifik yang diselesaikan) + tabel `tantangan_kustom` (judul, deskripsi, `lencana_kode` hadiah, `bonus_koin`, `syarat` jsonb, `aktif`) + `tantangan_kustom_anak` (penyelesaian per anak). RLS: baca aktif (authenticated), admin kelola.
- **Syarat kombinasi** (`syarat` = array `SyaratItem {tipe:'paket'|'mesin'|'tema'|'apa', ref, jumlah, minBintang}`) — semua item harus terpenuhi. Logika murni `lib/domain/tantangan-kustom.ts` (`cocokItem`, `progresTantanganKustom`, `ringkasSyarat`, `MESIN_LIST`).
- **Admin** (menu **🏆 Tantangan**): `/admin/tantangan` (`TantanganForm` buat/edit dgn baris syarat dinamis + pilih game/jenis/tema; `TantanganList` toggle aktif/hapus). Data `lib/data/tantangan-kustom.ts` (+ opsi game/tema) & `tantangan-kustom-actions.ts`.
- **Evaluasi**: di `catatHasil` — setelah main, tantangan aktif yang syaratnya terpenuhi & belum selesai → beri lencana hadiah + bonus koin + tandai selesai (`tantangan_kustom_anak`). Semua di dalam try/catch (fallback pra-migrasi; `paket_id` di-set via update terpisah agar aman).
- **Tampilan**: layar **Reward** ("🏆 Misi selesai"), **Menu Anak** (section 🏆 MISI dgn progres n/total; **klik misi → popup deskripsi** yang diisi admin + progres). Reader `getGamifikasiAnak` mengembalikan `kustom[]` (termasuk `deskripsi`).
- **Rentang usia** (migrasi **0045**: `tantangan_kustom.usia_min`/`usia_max`, default 0–99): tantangan hanya tampil & dievaluasi untuk anak yang umurnya (dari `tanggal_lahir`, `umurTahun`) masuk rentang. Difilter di `getGamifikasiAnak` & `catatHasil`; input usia di `TantanganForm`, tampil di `TantanganList`.

### Responsif (mobile-first → tablet/desktop)
- **Poles global**: `viewport` eksplisit (`layout.tsx`), `body{overflow-x:hidden}`, `img/video/kontrol max-width:100%`, `*{min-width:0}`, shell game `100dvh`. Verifikasi puppeteer tanpa overflow di 320–1280px.
- **Kelas utilitas** (`globals.css`): `.kp-page` (fluid, isi lebar s.d. 1040px), `.kp-page-narrow` (≤680px, form/baca), `.kp-grid-produk` (2→3→4 kolom), `.kp-grid-kartu` (1→2→3 kolom).
- **Diterapkan**: halaman daftar/kartu pakai `.kp-page` + grid (Store, Beranda `/pilih-anak` [kartu anak & artikel], `/event`, `/kelas-saya`, `/favorit`, `/pesanan`); halaman form/detail pakai `.kp-page-narrow` (`/keranjang`, `/komunitas`, `/pengaturan`, `/pesanan/[id]`, rapor); admin `.wrap` dilebarkan 760→1040. Tombol "+ Keranjang" dikecilkan agar proporsional di grid tablet. **Default mobile tak berubah** (breakpoint hanya menambah di layar besar). Layar game anak tetap kolom HP (didesain untuk sentuh).

### Log Aktivitas & Analitik penggunaan fitur — migrasi 0046
Merekam menu/fitur yang dibuka user untuk analitik "sedang buka apa" & "fitur terpopuler".
- **Migrasi 0046**: tabel `aktivitas` (`ortu_id`, `anak_id?`, `fitur`, `dibuat_at`). RLS: user insert milik sendiri, admin baca semua. Index waktu/fitur/ortu.
- **Perekam**: `components/RekamAktivitas.tsx` (client, 1× saat mount) memanggil `catatAktivitas(fitur, anakId?)` (`lib/data/aktivitas-actions.ts`, fire-and-forget). Dipasang di menu utama: Beranda (`beranda`), Menu Anak (`game`), `store`, `event`, `komunitas`, `kelas`(kelas-saya), `pesanan`, Rapor (`rapor`).
- **Reader** `lib/data/aktivitas.ts` `getAktivitasRingkas()` (fallback aman): aktivitas terakhir per user hari ini, fitur terpopuler hari ini & 7 hari (WIB) + `FITUR_LABEL`.
- **Dashboard** `/admin/analitik` tambah 3 seksi: "Sedang aktif hari ini (buka menu apa)", "Fitur terpopuler hari ini", "Fitur terpopuler (7 hari)".

### Masukan / Feedback aplikasi — migrasi 0047 & 0048
- **Migrasi 0047** tabel `feedback` + **0048** kolom `jawaban jsonb` (survei terstruktur). RLS: user kirim milik sendiri, admin baca semua.
- **Customer**: seksi **"MASUKAN UNTUK APLIKASI"** di `/pengaturan` → `FeedbackForm` = **survei 8 pertanyaan** (Q1 positioning, Q2 fitur favorit + Lainnya, Q3 UI/UX, Q4 kekurangan, Q5 kesediaan Ya/Mungkin/Tidak, Q6 harga wajar, Q7 rekomendasi NPS 1–10, Q8 saran utama). Bentuk jawaban di `lib/feedback-tipe.ts` (`JawabanFeedback`, `FITUR_OPSI`, dll.), action `kirimFeedback(jawaban)`.
- **Admin**: `/admin/feedback` (menu **⭐ Masukan**) — kartu per responden (email, waktu WIB, tag NPS/kesediaan/harga + jawaban teks) + ringkasan **rata-rata NPS**. Reader `lib/data/feedback.ts`.

### Diskon Store & Event (persentase) + berat produk — migrasi 0049 & 0050
Diskon **persentase per-produk** untuk 2 tier (Trial & Berlangganan), diskon **Event** khusus pelanggan aktif, + berat produk. (0049 sempat pakai harga nominal; **0050 mengganti ke persen** — kolom nominal 0049 tak dipakai lagi.)
- **Migrasi**: 0049 `produk.berat_gram`; **0050** `produk.diskon_trial_persen`, `produk.diskon_langganan_persen`, `event.diskon_langganan_persen`. (⚠️ dipakai di SELECT produk/event → **wajib dijalankan sebelum deploy**.)
- **Aturan** (`lib/domain/harga.ts`, murni): persen produk → status `aktif`=diskon langganan, selain aktif (trial/tenggang/kadaluarsa)=diskon trial; event → diskon **hanya** untuk `aktif`. Harga = `harga*(100−persen)/100`. Status user via `lib/data/langganan-status.ts`.
- **Harga aktual**: `checkout` & `daftarEvent` menghitung harga sesuai status → snapshot ke `item_pesanan.harga` / `pendaftaran_event.total`.
- **Tampilan**: harga normal **dicoret** + harga dibayar + badge **"−X%"** + baris "Trial −a% / Langganan −b%" (yang berlaku ditebalkan) di `ProdukCard`, `ProdukDetail`; event tampil harga coret + "diskon berlangganan −X%".
- **Admin**: form Produk input **Diskon Trial (%)**, **Diskon Langganan (%)**, **Berat (gram)**; form Event input **Diskon Berlangganan (%)**.

### Invoice & konfirmasi WA ke admin (semua transaksi)
Master WA admin di `pengaturan_pembayaran` — **per jenis transaksi** (migrasi **0051**): `wa_nomor` (umum/langganan + fallback), `wa_event`, `wa_store` (kosong → pakai `wa_nomor`). Helper `waUntuk(cfg,'event'|'store'|'langganan')` + `linkWa()` (`lib/format.ts`). Semua diedit di `/admin/pengaturan-bayar`.
- **Store**: `/pesanan/[id]` = **🧾 Invoice** (item, subtotal, ongkir, total, alamat). Tombol **"💬 Konfirmasi ongkir via WhatsApp"** saat status `menunggu_ongkir`; **"💬 Konfirmasi pembayaran via WhatsApp"** saat `dibayar` (setelah upload bukti). Pesan berisi no invoice + nominal.
- **Event**: setelah daftar (+ upload bukti) `DaftarForm` menampilkan layar sukses berisi **ringkasan/invoice** (event, jumlah anak, total) + tombol **"💬 Konfirmasi ke Admin via WhatsApp"**. `waNomor` dikirim dari page via `getPengaturanBayar`.
- **Langganan**: `/pengaturan` menampilkan harga + instruksi transfer + tombol **"Konfirmasi via WhatsApp"** (sudah pakai master WA).
Semua tombol WA memakai master WA yang sama → admin tahu ada transaksi masuk & segera memproses via dashboard.

### Perbaikan & penyesuaian lain (terkini)
- **Validasi tanggal lahir anak**: `tambahAnak`, `updateAnak`, & `POST /api/anak` menolak tanggal ≥ hari ini (WIB); input `type=date` diberi `max` = kemarin. (Anak <2 th tetap Mode Ortu = desain: bayi → aktivitas kelas bermain, bukan game solo.)
- **Kelola Langganan**: tiap kartu member menampilkan **tanggal & jam pendaftaran** (`profiles.created_at`, WIB).
- **Materi kelas bermain**: tombol/tautan **Unduh PDF dihilangkan** dari `/kelas/[id]`, Mode Anak, & Mode Ortu (materi tetap tampil inline; Worksheet/Ide/Bagikan tetap ada). E-sertifikat & stiker tetap punya Unduh PDF.
- **Analitik DAU/WAU/MAU** kini menyertakan **log aktivitas (buka menu)** agar konsisten dengan daftar "Sedang aktif hari ini".
- **Konten**: halaman `/tentang` ditulis ulang (visi/misi/fitur/nilai/filosofi); FAQ landing "Apa itu KidzPlayful" → "Play-Based Learning Ecosystem"; footer landing → "Play-Based Learning Ecosystem"; teks "Gratis 14 hari…" di hero dihapus.

### Modul Keuangan / Business Management v1 — migrasi 0052
Blueprint: `docs/BLUEPRINT-KEUANGAN-KIDZPLAYFUL.pdf`. Basis **kas**.
- **Migrasi 0052**: tabel `transaksi_keuangan` (ledger tunggal, unique `(ref_tipe,ref_id)` utk pesanan/pendaftaran), `pembayaran_langganan` (riwayat membership), `aset`; kolom `pesanan.diverifikasi_pada`, `pendaftaran_event.diverifikasi_pada`, `profiles.is_investor` + fungsi `is_investor()`; **backfill** revenue Store (subtotal, status diproses/dikirim/selesai) & Event (total, diterima). RLS: admin kelola, admin+investor baca.
- **Pencatatan otomatis** (`lib/data/ledger.ts` `catatLedger`/`hapusLedgerRef`, try/catch): `verifikasiPesanan`→masuk store=subtotal (ongkir bukan revenue) + `diverifikasi_pada`; `setStatusPendaftaran diterima`→masuk event=total; `aktifkanLangganan`→masuk membership=nominal + baris `pembayaran_langganan`. Pembatalan (`batal`/`ditolak`) → hapus baris ledger ref.
- **Admin** menu **💼 Keuangan** (`/admin/keuangan`): Dashboard CEO (revenue/expense/net/saldo/MRR/member/growth), Transaksi (ledger + cashflow per bulan), Pengeluaran (input+hapus), Aset (CRUD + opsi catat pengeluaran), Laporan (P&L + per-bulan + per-kategori + **ekspor CSV**), Pajak/Omzet (12 bln + estimasi PPh final 0,5%). Reader `lib/data/keuangan.ts`, aksi `keuangan-actions.ts`.
- **Investor** (role `profiles.is_investor`): halaman read-only `/investor` (guard `lib/data/investor.ts`) — Revenue, MRR, Growth, Net, Saldo, Member, Event, Store, Runway + tren 6 bulan. Set investor via SQL: `update profiles set is_investor=true where email='…'`.
- **Penyempurnaan (migrasi 0053):** master **`kategori_aset`** (dropdown, dikelola di halaman Aset — tambah/hapus). Upload **foto nota** untuk Pengeluaran & Aset via `components/UploadNota.tsx` (kompres **WebP** di klien via canvas, maks 1280px, q0.8 → hemat server; simpan `lampiran_url`/`invoice_url`). Halaman **Transaksi** kini punya **filter rentang tanggal + arah + kategori**; Laporan "per kategori" **bisa diklik** → drill-down transaksi per tanggal. **Metode pembayaran** = dropdown Cash/Transfer/QRIS/CC (`lib/metode.ts` `METODE_BAYAR`, dipakai di Expense & Aktifkan Langganan). **Input nominal** berformat ribuan otomatis (`components/InputRupiah.tsx`; server action tetap membersihkan ke angka).

### Catatan operasional — reset password akun
Reset password user (mis. akun admin) via **Supabase SQL Editor** bila Dashboard tak punya tombolnya:
```sql
update auth.users
set encrypted_password = crypt('<password-baru>', gen_salt('bf')), updated_at = now()
where email = '<email>';
```
(bila error `function crypt does not exist`, pakai prefix `extensions.crypt(...)` / `extensions.gen_salt('bf')`). `.env.local` hanya berisi anon key — reset password tak bisa dari kode aplikasi.

---

---

## 15g. Fitur & Peningkatan (2026-07-07 s.d. 2026-08-19)

Bagian ini menutup rentang **migrasi 0053–0088**. Dikelompokkan per tema (bukan per hari) supaya bisa dibaca sebagai peta modul.

### Modul Keuangan — dari ledger ke BI (0053–0055, 0088)
- **Master terpusat** `/admin/keuangan/master`: kategori aset (0053) & kategori pengeluaran (0055). `kode` kategori pengeluaran adalah **nilai stabil yang tersimpan di ledger** — logika `marketing`/`aset`/`pajak` bergantung padanya, jadi kode tidak boleh diubah sembarangan.
- **Anggaran** (0054): budget per bulan × kategori, dibandingkan dengan realisasi + **forecast 6 bulan**. Sisa budget kategori ditampilkan langsung di form Pengeluaran & Aset supaya admin tahu sebelum menyimpan.
- **KPI & Insight** tanpa tabel baru — dihitung dari ledger yang sudah ada.
- **Setiap transaksi bisa diklik** → halaman detail yang membawa ke sumbernya (pesanan Store / pendaftaran event / langganan / aset / sponsorship).
- **Pengeluaran per event** (0088): kolom `transaksi_keuangan.event_id` + dropdown filter Event, sehingga laporan bisa menjawab "event ini menghasilkan berapa, menghabiskan berapa".
- **Revenue ikut pindah saat pendaftar direschedule** — dan itu **disengaja**: `reschedulePendaftaran` mengubah `event_id` pada baris pendaftaran yang sama, sementara seluruh jalur revenue per event bersifat **turunan**, bukan snapshot. Karena itu **jangan** menambahkan snapshot event pada baris ledger pendaftaran — justru akan mematahkan perilaku ini.

### Modul Sponsor (0058)
Pipeline lead → negosiasi → kesepakatan → invoice → dibayar → selesai. **Generate Invoice dikunci** sampai status Kesepakatan. Sponsor **uang** masuk ledger saat Dibayar; sponsor **barang (in-kind)** dicatat nilainya tapi tidak menyentuh kas.

### Role, Pengguna & Akses Menu (0056, 0063, 0067)
- Role **Super User** (0056) di atas admin; trigger anti-eskalasi diperluas ke semua kolom role.
- Halaman **Pengguna & Role** `/admin/users` — termasuk **buat user baru** dengan role (memakai service role key, server-only).
- **Matriks Akses Menu** `/admin/akses-menu` (0063, khusus super user): centang menu per role Admin/Investor/Guru. Menu sensitif (keuangan, pengguna, pembayaran, trial, sponsor) **default hanya super user**. Ditegakkan dua lapis: layout menyembunyikan, `proxy.ts` memblokir bila rute diketik langsung.
- **Matriks Akses Fitur** (0067) untuk admin/guru/psikolog: chat konsultasi, memberi nilai perkembangan, rekomendasi produk/event/materi.

### Pembatasan Trial per item (0059–0061)
Dari "boleh/tidak boleh" global menjadi **per item**: admin menandai konten mana yang boleh diakses user trial (`boleh_trial` di tema, paket, kelas, video). Item yang tidak ditandai **tetap tampil** tapi terkunci 🔒 dengan ajakan perpanjang — bukan disembunyikan, supaya user tahu apa yang ia dapat bila berlangganan. Ada toggle global untuk Komunitas (0061) dan batas jumlah anak untuk user non-aktif.

### Chat Psikolog (0064–0067, 0072, 0073, 0087)
Role psikolog + jadwal (hari, jam, kuota/hari) → booking oleh ortu → chat dua arah → rekomendasi naratif + rekomendasi produk/event/materi → semuanya muncul di Rapor anak. Penyempurnaan: **durasi sesi + hitung mundur** sinkron di kedua sisi dengan peringatan 1 menit terakhir dan auto-selesai (0072), **booking menyimpan jam** dan RPC memvalidasi jam terhadap window jadwal (0073), riwayat konsultasi dikelompokkan per tanggal, dan **master profil psikolog** yang dikelola admin (0087: nama bergelar, badge, spesialisasi, foto, pendidikan S1 & profesi, no. STR, pengalaman) menggerakkan UI konsultasi berbasis kartu di sisi ortu.

### Penilaian Perkembangan per event (0062)
Admin menetapkan **Parameter (Area + Indikator) per event** (+ tombol Duplikat dari event lain), guru/admin memberi **Nilai** per anak dengan skala PAUD. Parameter di `event.indikator_perkembangan`, nilai snapshot di `catatan_perkembangan.penilaian`.

### Event & pendaftaran — operasional harian
- **Dua kelas per event** (0069): Baby & Toddler dengan tanggal/jam berbeda; kosong = gabungan. Customer memilih kelas saat mendaftar, dan jadwal kelas terpilih di-snapshot ke `kelas_jadwal`.
- **Pendamping berbayar per event** (0070) + **kuota per kelas** (0086, null/0 = tanpa batas) dengan alert "kuota sudah penuh"; kuota terpakai dihitung RPC agar tidak salah saat daftar disaring.
- **Alasan penolakan** (0075) tampil ke orang tua; pendaftaran ditolak tidak lagi dihitung sebagai peserta.
- **Pesan WA manual per event** (0085) di halaman Reminder, plus pencarian nama anak/orang tua dan **jam kelas ikut disebut** di pesan.
- Halaman **Pendaftar**: pencarian nama, grup per kelas yang bisa dilipat, **filter rentang usia (satuan bulan)**, **urutan waktu daftar (Terbaru/Terlama)**, umur anak per hari ini, waktu daftar, tombol **WA ke ortu**, **pindah kategori kelas** (Baby↔Toddler dengan penegakan kuota), **reschedule ke event lain**, absensi per anak, ekspor **CSV** & **PDF** peserta (termasuk kolom jenis kelamin), dan bukti bayar dibuka lewat **modal** (`BuktiLightbox`), bukan tab baru.
- **Peserta & sisa kuota selalu dihitung dari seluruh pendaftaran kelas itu**, bukan dari hasil filter — dulu "sisa kuota" jadi salah setiap kali admin mencari.

### E-Sertifikat, Stiker & Cetak
- **Sertifikat diunduh sebagai JPEG A4 landscape** (3508×2480 @300dpi) lewat canvas, **bukan** dialog cetak — ukuran berkasnya jadi pasti, tidak bergantung setelan skala/margin pengguna. Seluruh teks hitam kecuali **nama anak**; nama memakai **nama lengkap** yang dibaca ulang dari tabel `anak`, sehingga **sertifikat lama pun ikut benar tanpa generate ulang**.
- **Stiker nama**: baris kedua memakai **kategori kelas** (Baby/Toddler Class), bukan judul event; dibawa **per stiker** karena satu event bisa memuat kedua kelas. Seluruh teks **merah `#d62828`** dengan ukuran diperbesar (nama sampai 34pt), dan `ukuranNama()` (`lib/domain/stiker.ts`, teruji) mengecilkan nama panjang agar tak ada kata terpenggal atau isi yang melewati tinggi 60mm. Sapaan "Hai, aku" dihapus.
- **Paginasi cetak**: Chrome tidak menghormati `break-inside: avoid` pada grid item, sehingga baris ke-5 dulu terpenggal. Sekarang stiker dipotong sendiri menjadi kelompok 10 dan tiap kelompok memakai `break-after: page`.

### Ide Bermain & master data (0076–0079, 0083)
Tujuan pembelajaran + rentang usia (0076), **fokus area perkembangan** + peran orang tua (0077), master **Fokus Area** (0078) & **Kategori Usia** (0079) sebagai dropdown/chips (bukan ketik manual), **gambar sampul** (0083) yang dipakai kartu share, banner detail, dan teaser publik. Isi materi dirender komponen bersama `KelasIsi` agar identik di detail, Mode Anak, dan Mode Ortu.

### Mesin game baru (0074, 0080)
Tiga mesin **calistung** — Rangkai Suku Kata, Jiplak Huruf & Angka, Hitung Benda (0074) — dan mesin **Ingatan** (memory/concentration, 0080). Hitung-Kode diperluas ke perkalian & pembagian. **Setiap mesin baru wajib migrasi yang memperluas CHECK `paket_aset_mesin_check`**; tanpa itu INSERT paket ditolak DB dan errornya ter-redact di production.

### Bagikan Konten, Atribusi & kartu Instagram (0081–0083)
- **Teaser publik** `/coba/kelas/[id]` & `/coba/tema/[id]` yang boleh dibaca anon (0081) + `ShareButton` (native share + fallback sosmed).
- **Atribusi share** (0082): UTM disisipkan otomatis, ditangkap **first-touch** di halaman publik, disimpan saat daftar, lalu tampil sebagai kartu Atribusi di `/admin/analitik`.
- **Kartu gambar IG** dari canvas tanpa dependency: **Story 1080×1920** dan **Feed 1080×1080**, keduanya mengambil isi dari **satu sumber** (`ShareButton.isiKartu()`) sehingga mustahil berbeda isi. Dua aturan wajib: teks memakai `ukuranPas()` (mengecil sampai muat, bukan dipotong elipsis) dan foto memakai `contain` di kartu Feed karena sampul artikel sering memuat tulisan.

### Voucher (0084)
Master voucher (nominal/persen, kuota total & per user, rentang tanggal, berlaku event/produk) + redeem di pendaftaran event dan pembelian produk. Potongan disimpan di transaksinya, ledger mencatat **nilai net**, dan kuota **dilepas kembali** bila pendaftaran ditolak atau pesanan dibatalkan.

### Performa & gambar
Cache halaman publik (`unstable_cache` + `updateTag`), pengurangan query berulang di halaman tersibuk, **kompresi gambar saat unggah** (bukti bayar 1280/0.8; dokumen/artikel/produk/banner; template sertifikat & stiker 2000/0.9) plus skrip backfill (`sharp`, dry-run default) untuk gambar lama di Storage, dan lazy-load gambar. CI GitHub Actions menjalankan typecheck + vitest + build di tiap PR & push master.

### Perbaikan penting (bug nyata + pelajarannya)
| Bug | Akar & pelajaran |
|---|---|
| Field tak ter-reset setelah simpan — **foto nota transaksi sebelumnya ikut ter-submit** ke entri berikutnya | React 19 hanya mereset field **uncontrolled**. Semua nilai yang ikut ter-submit dibuat uncontrolled + `usePadaResetForm` untuk state tampilan |
| Kolom kuota (0086) mematikan halaman event sebelum migrasi dijalankan | **Kolom baru harus toleran**: baca lewat query terpisah yang mengembalikan default bila gagal, dan retry write tanpa kolom itu |
| Daftar event **tanpa** voucher gagal | Jalur non-voucher dipisah memakai insert polos |
| Game Ingatan: pasangan tak terdeteksi saat klik cepat | Stale closure — model pasangan dibuat eksplisit (1 baris = 1 pasangan, deteksi by id) |
| Orang tua kehilangan akses event yang **diarsipkan**, sehingga dokumentasi & e-sertifikat hilang dari Rapor | Blok KEGIATAN dulu hanya lahir dari baris catatan/sertifikat. Kini **kehadiran** (`hadir_anak_ids`) juga memunculkan bloknya, dan judul/tanggal/dokumentasi dibaca **live** dari event (snapshot hanya cadangan) |
| **Klik profil anak tidak membuka halaman anak** | `getAnakTerjamin` memantulkan **diam-diam** ke `/pilih-anak` saat langganan tak aktif — dan juga saat baris `langganan` hilang/ganda. Gerbang dicabut (akses dibatasi lewat kunci per konten), dan **setiap redirect kini wajib membawa alasan yang ditampilkan** |
| Sertifikat memakai nama panggilan / tanpa link dokumentasi | Snapshot dibaca ulang dari sumbernya saat ditampilkan |
| Deploy senyap (repo privat + Vercel Hobby) | `git push` sukses & CI hijau tapi fitur tak pernah tayang. Prosedur deteksi: `RUNBOOK-OPERASIONAL.md` RB-10 |

### Penamaan: "Kelas Bermain" → "Ide Bermain"
Label tampilan diganti di menu admin, nav bawah orang tua (`Kelas` → `Ide`), judul `/kelas-saya` & `/favorit`, layar terkunci, dan label analitik. **Yang sengaja tidak diubah**: `key: 'kelas-bermain'` di `MENU_ADMIN` (tersimpan di konfigurasi Akses Menu di database — menggantinya mencabut hak akses semua role), rute `/admin/kelas-bermain` · `/kelas-saya` · `/kelas/[id]` · `/api/kelas-bermain`, tabel `kelas_bermain`, **"Event Kelas Bermain"** (fitur berbeda), dan judul SEO/landing yang sudah terindeks.

## 15. Glosarium

- `bahan` (jsonb): `[{nama, link, produk_id}]` — produk_id → Store internal.
- `aktivitas` (jsonb): `[{judul, cara_membuat, langkah[]}]`.
- `catatan_perkembangan.aspek` (jsonb): nilai rubrik PAUD per aspek (`BB/MB/BSH/BSB`).
- `is_superuser` / `is_admin` / `is_guru` / `is_investor` / `is_psikolog` (profiles): penanda peran. Menu admin per role disimpan di `pengaturan_menu.akses`, akses fitur di `pengaturan_menu.fitur`.
- `harga_per_anak`, `pesanan.status`, `produk.stok`, `keranjang_item` (badge), `reminder_terkirim` (penanda WA H-1 sudah dikirim).
- `mode_default` (anak): <2 → Mode Ortu, ≥2 → Mode Anak. `jenis_kelamin`: 'laki-laki'|'perempuan'.
- `DataMewarnai` (butir game mewarnai): `{sumber:'template'|'svg', template?, svg?, palette[], mode:'bebas'|'sesuai'|'berkode', target?}`.
- **`mesin`** (15 engine): `tekan-sesuai, seret-wadah, cari-pasangan, mewarnai, dekode, urutan, jalur, hitung, cocokkan, ejakata, garis` (§15d) + calistung `sukukata, jiplak, hitung-benda` (0074) + `ingatan` (0080). **Mesin baru wajib migrasi yang memperluas CHECK `paket_aset_mesin_check`.**
- `target_detik` (paket): Mode Tantangan — selesai ≤ target = bonus ⭐/🪙. `hasil_main.durasi_detik` = lama main per sesi (dipakai timer & Rapor).
- `event.stiker_bg_url` / `sertifikat_bg_url` / `dokumentasi_url`: template stiker / template sertifikat / link dokumentasi per event.
- `pengaturan_pembayaran` (baris tunggal `id=1`): master harga langganan + rekening/QRIS/WA transfer, diedit di `/admin/pengaturan-bayar`, dibaca via `getPengaturanBayar()`.
- `boleh_trial` (tema/paket_aset/kelas_bermain/video): true = boleh diakses user trial. `dibatasiTrial(status)` = `status !== 'aktif'` → item tanpa izin tampil 🔒, **bukan** disembunyikan.
- `transaksi_keuangan.ref_tipe`/`ref_id`: sumber baris ledger (`pesanan`|`pendaftaran`|`langganan`|`aset`|`sponsorship`|`manual`), unik berpasangan supaya satu sumber tak tercatat dua kali. `event_id` (0088) = pengeluaran untuk event tertentu.
- `pendaftaran_event.kelas` / `kelas_jadwal`: kelas terpilih (`baby`|`toddler`|`gabungan`) + snapshot tampilan tanggal & jamnya. `hadir_anak_ids[]` = absensi per anak, dasar penerbitan sertifikat.
- `event.kuota_baby/kuota_toddler/kuota_gabungan`: null atau 0 = **tanpa batas**; terpakai dihitung RPC `kuota_terpakai_event`.
- `ref_sumber`/`ref_saluran`/`ref_jenis`: atribusi first-touch dari fitur Bagikan (0082).
- `voucher.tipe`: `nominal`|`persen`; `voucher_redeem` mencatat pemakaian per (voucher, ortu, transaksi) dan kuotanya dilepas bila transaksi dibatalkan.
- `psikolog_profil`: master profil psikolog yang dikelola admin — sengaja **terpisah** dari `profiles` karena datanya dibaca customer.

---

*Mengikuti kode terkini per **2026-08-19**, migrasi s/d **0088**. Riwayat fitur berurutan waktu ada di §15b–§15g; detail per halaman/menu di [`DEVELOPER-KIDZPLAYFUL.md`](DEVELOPER-KIDZPLAYFUL.md).*

*Regenerasi HTML+PDF:*
```bash
python tools/md2pdf.py docs/DOKUMENTASI-KIDZPLAYFUL.md
chrome --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=docs/DOKUMENTASI-KIDZPLAYFUL.pdf docs/DOKUMENTASI-KIDZPLAYFUL.html
```
