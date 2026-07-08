# Dokumentasi Teknis — KidzPlayful

Dokumen ini menjelaskan **seluruh alur** aplikasi KidzPlayful dari nol sampai deploy: arsitektur, tiap berkas & perannya, parameter penting, skema database, serta cara deploy ke **Vercel** (frontend) dan **Supabase** (backend).

- **Aplikasi:** web app kelas bermain digital anak 0–4 tahun — game sensorik/motorik (termasuk **game Mewarnai**), kelas bermain, video, komunitas, **event offline berbayar + pendaftaran**, **toko/Store**, **Catatan Perkembangan Bermain (penilaian guru)**, dan **reminder WhatsApp**. Ada juga **REST API untuk aplikasi mobile (Flutter)**.
- **Repo:** `github.com/khabibrizal/kidzplayful` · **Live:** `https://www.kidzplayful.com` (domain kustom; region Vercel `bom1` = co-located dgn Supabase `ap-south-1`).
- **Stack:** Next.js 16 (App Router, TypeScript) + Supabase (Postgres + Auth + Storage). "Backend" = Supabase + Server Actions/Server Components Next.js (tanpa server terpisah).
- **Peran pengguna:** Orang tua (default), **Admin** (`is_admin`), **Guru** (`is_guru`).

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
   ├─ Postgres  : tabel + RLS + trigger/function (is_admin/is_guru)
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

Migrasi `supabase/migrations/0001..0037` (jalankan berurutan di SQL Editor).

### `profiles` (0001; +is_admin 0004; +nama_tampilan 0010; +no_wa 0015; +is_guru 0020; +alamat 0023)
`id(PK), email, pin_ortu, is_admin, is_guru, nama_tampilan, no_wa, created_at`. RLS: profil sendiri; admin baca semua + **admin update profil** (untuk set/cabut guru). **Trigger `cegah_self_admin` (0012, diperluas 0020):** non-admin tak bisa mengubah `is_admin`/`is_guru` (hanya admin / SQL).

### `anak` (0001; +jenis_kelamin 0024) · `langganan` (0001) · `tema`/`paket_aset`/`hasil_main`/`video`
- `anak.jenis_kelamin`: 'laki-laki' | 'perempuan' (opsional). `paket_aset.mesin` kini termasuk **`mewarnai`** (0025). Katalog (event/produk/kelas_bermain publik) boleh **dibaca anon** (0022) untuk cache.
Profil anak, langganan trial, konten game/tema/skor/video (lihat versi sebelumnya — tetap).

### `kelas_bermain` (0014; jsonb 0016; +produk_id)
`judul`, `bahan` jsonb `[{nama, link, produk_id}]` (link toko luar / produk Store internal), `aktivitas` jsonb `[{judul, cara_membuat, langkah[]}]`, `link_ide`, `worksheet_url`, `status`.

### `favorit` (0015) · `riwayat_kelas` (0018)
Favorit kelas & riwayat materi yang dibuka (PK gabungan ortu+kelas; RLS milik sendiri).

### `event` (0017) · `pendaftaran_event` (0017; +reminder_terkirim 0021)
- `event`: judul, lokasi, tanggal, jam_mulai/selesai, deskripsi, gambar_url, harga_per_anak, status(tampil/arsip).
- `pendaftaran_event`: event_id, ortu_id, anak_ids[], anak_nama[], jumlah_anak, total, bukti_url, status(menunggu/diterima/ditolak), **reminder_terkirim**. RLS: milik sendiri + admin update; **guru boleh baca** (0020).

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

**Urutan migrasi:** … → 0019 store → 0020 catatan perkembangan (+is_guru) → 0021 reminder → 0022 katalog baca anon → 0023 profil alamat → 0024 anak jenis_kelamin → 0025 mesin mewarnai → **0026 sertifikat** (kolom `event.sertifikat_bg_url`/`dokumentasi_url`, `pendaftaran_event.hadir_anak_ids`, tabel `sertifikat`) → **0027 reschedule** (`pendaftaran_event.event_asal_id`/`alasan_reschedule`) → **0028 postingan topik** (`postingan.topik`).

---

## 8. Struktur Folder & Berkas (utama)

### `src/lib/`
- `supabase/{client,server}.ts`; `domain/*` (logika murni + 30 test); `game/tipe.ts` (semua interface incl. `Produk`, `Pesanan`, `EventKelas`, `CatatanPerkembangan`, `SkalaPaud`).
- **`format.ts`** — `formatTanggal`, `formatRupiah`, `STATUS_PESANAN`, **`ASPEK_PAUD`/`SKALA_PAUD`/`metaSkala`**, **`nomorWaIntl`/`linkWa`** (WA).

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

### `src/components/`
Pewi, Confetti, game/*, FavoritBtn, BeliBtn (internal/eksternal+konfirmasi), UnduhPdfBtn, EventCard/EventCarousel (tampil peserta+status per anak), ProdukCard, TambahKeranjangBtn, BottomNav (badge keranjang), **CatatanCard** (rubrik), **Logo** (`/logo.png`, transparan, `plate=false`), **SertifikatView** (e-sertifikat), **YoutubeEmbed** (embed materi).

### `src/app/` — rute (yang baru ditandai ✦)
| Rute | Untuk |
|---|---|
| `/`, `/daftar`, `/login`, `/lupa-sandi`, `/reset-sandi` | Landing + Auth (+Lupa Password). Pakai **Logo**. |
| `/pilih-anak` | Dashboard ortu (sapaan, Favoritmu, carousel Event) + BottomNav |
| `/favorit`, `/kelas/[id]` | Favorit + detail kelas (Unduh PDF, 🛒 Beli) |
| ✦ `/kelas-saya` | Menu 🎈 Kelas Bermain: **event yang diikuti + Catatan Perkembangan**, lalu riwayat materi |
| `/main/[anakId]`, `/ortu/[anakId]` | Mode Anak / Mode Ortu |
| `/anak/[anakId]`(+`/laporan`) | Kelola anak + **Rapor** (termasuk Catatan Perkembangan) |
| `/pengaturan`, `/komunitas`(+`/[postId]`) | Akun + Forum |
| `/event`(+`/[id]/daftar`) | Event + pendaftaran (badge status, ✦ tombol 📋 Catatan) |
| ✦ `/catatan/[eventId]` | Ortu lihat Catatan Perkembangan anaknya di satu event |
| `/store`(+`/[id]`), `/keranjang`, `/pesanan`(+`/[id]`) | Toko + keranjang + pesanan |
| ✦ `/guru`(+`/[eventId]`) | **Area Guru**: pilih event → isi rubrik catatan per anak |
| `/admin` + sub | Dashboard admin: tema, video, kelas-bermain, langganan, laporan, komunitas, event (+Pendaftar: absensi/sertifikat/reschedule), produk, pesanan, **guru**, **reminder**, ✦ **analitik**. **Nav utama persisten + tombol Back** (`AdminNav`) di semua halaman. |

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

**Bottom Nav (6 tab):** 🏠 Beranda · 🎈 Kelas · 🛒 Store (badge keranjang) · 📦 Pesanan · 💬 Komunitas · 👤 Akun.

---

## 10. Keamanan

1. **RLS tiap tabel.** 2. Guard kode (`getAnakTerjamin`, `getAdminTerjamin`, `getGuruTerjamin`, `adminDb`, filter `.eq(..user.id)`).
3. **`is_admin()`/`is_guru()` + trigger** — non-admin tak bisa promote diri jadi admin/guru; admin yang mengelola role.
4. Total event/pesanan dihitung server; harga di-snapshot. Stok berkurang saat verifikasi.
5. Upload user dibatasi folder `bukti/`. 6. Catatan: ortu hanya lihat catatan anaknya; guru hanya baca pendaftaran + tulis catatan.

---

## 11. Testing & Verifikasi

- Unit: `npm test` (30). E2E: `npm run e2e`.
- Skrip verifikasi prod (`tools/*.mjs`): `event_m14_full.mjs`, `store_m16_check.mjs`, `catatan_m17_check.mjs`, dll. (`node tools/<nama>.mjs`).

---

## 12. Deploy — Supabase

1. Buat proyek. 2. **SQL Editor** → migrasi `0001`–`0021` berurutan. 3. Auth: matikan Confirm email (dev) / atur **SMTP** (agar reset password terkirim) + **Redirect URL** `https://<domain>/reset-sandi` + Site URL. 4. API → salin URL + publishable key ke env Vercel & lokal. 5. Admin (sekali): `update public.profiles set is_admin=true where email='…';` Guru diaktifkan dari Admin → Kelola Guru. 6. Bucket `aset` (0007) + izin bukti (0017).

## 13. Deploy — Vercel

Push GitHub → Import (Next.js) → isi 2 env var **sebelum** Deploy → tiap `git push master` auto-deploy. Plan **Hobby**: repo **public**. PowerShell: `&&` tak berlaku — pakai `;` atau baris terpisah.

---

## 14. Masalah & Solusi (ringkas)

| Masalah | Solusi |
|---|---|
| Deploy "Blocked" (Hobby+private) | Repo dibuat public |
| Login admin ke /pilih-anak | Filter `.eq('id',user.id)` di query |
| Self-promote admin/guru | Trigger `cegah_self_admin` (0012/0020) |
| Migrasi 0016 `subquery in transform` | Konversi bahan via kolom sementara + UPDATE |
| Input link YouTube ditolak | Ekstraksi dukung shorts/live/format lain |
| Menu Kelas Bermain kosong (event ≠ materi) | `/kelas-saya` kini tampilkan event yang diikuti + catatan |

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
… → **0026** sertifikat (`event.sertifikat_bg_url`/`dokumentasi_url`, `pendaftaran_event.hadir_anak_ids`, tabel `sertifikat`) → **0027** reschedule (`event_asal_id`,`alasan_reschedule`) → **0028** postingan topik (`postingan.topik`) → **0029** mesin dekode → **0030** mesin urutan → **0031** mesin jalur → **0032** mesin hitung → **0033** `paket_aset.target_detik` → **0034** `event.stiker_bg_url` → **0035** mesin cocokkan → **0036** mesin ejakata → **0037** mesin garis → **0038** tabel `pengaturan_pembayaran` → **0039** index performa → **0040** RPC `laporan_engagement` + index `hasil_main` → **0041** tabel `artikel` (blog). (0029–0037 mesin = ALTER CHECK `paket_aset_mesin_check`.)

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

### Catatan operasional — reset password akun
Reset password user (mis. akun admin) via **Supabase SQL Editor** bila Dashboard tak punya tombolnya:
```sql
update auth.users
set encrypted_password = crypt('<password-baru>', gen_salt('bf')), updated_at = now()
where email = '<email>';
```
(bila error `function crypt does not exist`, pakai prefix `extensions.crypt(...)` / `extensions.gen_salt('bf')`). `.env.local` hanya berisi anon key — reset password tak bisa dari kode aplikasi.

---

## 15. Glosarium

- `bahan` (jsonb): `[{nama, link, produk_id}]` — produk_id → Store internal.
- `aktivitas` (jsonb): `[{judul, cara_membuat, langkah[]}]`.
- `catatan_perkembangan.aspek` (jsonb): nilai rubrik PAUD per aspek (`BB/MB/BSH/BSB`).
- `is_admin` / `is_guru` (profiles): penanda peran.
- `harga_per_anak`, `pesanan.status`, `produk.stok`, `keranjang_item` (badge), `reminder_terkirim` (penanda WA H-1 sudah dikirim).
- `mode_default` (anak): <2 → Mode Ortu, ≥2 → Mode Anak. `jenis_kelamin`: 'laki-laki'|'perempuan'.
- `DataMewarnai` (butir game mewarnai): `{sumber:'template'|'svg', template?, svg?, palette[], mode:'bebas'|'sesuai'|'berkode', target?}`.
- **`mesin`** (11 engine): `tekan-sesuai, seret-wadah, cari-pasangan, mewarnai, dekode, urutan, jalur, hitung, cocokkan, ejakata, garis` (lihat §15d).
- `target_detik` (paket): Mode Tantangan — selesai ≤ target = bonus ⭐/🪙. `hasil_main.durasi_detik` = lama main per sesi (dipakai timer & Rapor).
- `event.stiker_bg_url` / `sertifikat_bg_url` / `dokumentasi_url`: template stiker / template sertifikat / link dokumentasi per event.
- `pengaturan_pembayaran` (baris tunggal `id=1`): master harga langganan + rekening/QRIS/WA transfer, diedit di `/admin/pengaturan-bayar`, dibaca via `getPengaturanBayar()`.

---

*Mengikuti kode terkini per 2026-07-03. Sesi 2026-07-02/03: E-Sertifikat, Reschedule, pendaftaran per-anak, Rapor collapse + waktu per game, koreksi ongkir, nav admin persisten, embed YouTube materi, topik komunitas, Analitik + Vercel Analytics, logo baru, **9 engine game koding** (dekode/urutan/jalur/hitung/cocokkan/ejakata/garis + mewarnai-berkode), **timer & Mode Tantangan**, **edit paket**, **Stiker Nama F4**. Migrasi s/d 0037. Regenerasi PDF: `python tools/md2pdf.py docs/DOKUMENTASI-KIDZPLAYFUL.md` lalu cetak HTML→PDF via Chrome.*
