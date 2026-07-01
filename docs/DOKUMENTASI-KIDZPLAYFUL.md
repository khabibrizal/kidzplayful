# Dokumentasi Teknis — KidzPlayful

Dokumen ini menjelaskan **seluruh alur** aplikasi KidzPlayful dari nol sampai deploy: arsitektur, tiap berkas & perannya, parameter penting, skema database, serta cara deploy ke **Vercel** (frontend) dan **Supabase** (backend).

- **Aplikasi:** web app kelas bermain digital anak 0–4 tahun — game sensorik/motorik, kelas bermain, video, komunitas, **event offline berbayar + pendaftaran**, **toko/Store**, **Catatan Perkembangan Bermain (penilaian guru)**, dan **reminder WhatsApp**.
- **Repo:** `github.com/khabibrizal/kidzplayful` · **Live:** `https://www.kidzplayful.com`
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

Migrasi `supabase/migrations/0001..0021` (jalankan berurutan di SQL Editor).

### `profiles` (0001; +is_admin 0004; +nama_tampilan 0010; +no_wa 0015; +is_guru 0020)
`id(PK), email, pin_ortu, is_admin, is_guru, nama_tampilan, no_wa, created_at`. RLS: profil sendiri; admin baca semua + **admin update profil** (untuk set/cabut guru). **Trigger `cegah_self_admin` (0012, diperluas 0020):** non-admin tak bisa mengubah `is_admin`/`is_guru` (hanya admin / SQL).

### `anak` (0001) · `langganan` (0001) · `tema`/`paket_aset`/`hasil_main`/`video`
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

**Urutan migrasi:** 0001 init → … → 0015 favorit(+no_wa) → 0016 kelas jsonb → 0017 event → 0018 riwayat → 0019 store → **0020 catatan perkembangan (+is_guru)** → **0021 reminder (+reminder_terkirim)**.

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
Pewi, Confetti, game/*, FavoritBtn, BeliBtn (internal/eksternal+konfirmasi), UnduhPdfBtn, EventCard/EventCarousel, ProdukCard, TambahKeranjangBtn, BottomNav (badge keranjang), **CatatanCard** (tampilan rubrik), **Logo** (`/logo.png` di plate hitam).

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
| `/admin` + sub | Dashboard admin: tema, video, kelas-bermain, langganan, laporan, komunitas, event, produk, pesanan, ✦ **guru** (Kelola Guru), ✦ **reminder** |

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

## 15. Glosarium

- `bahan` (jsonb): `[{nama, link, produk_id}]` — produk_id → Store internal.
- `aktivitas` (jsonb): `[{judul, cara_membuat, langkah[]}]`.
- `catatan_perkembangan.aspek` (jsonb): nilai rubrik PAUD per aspek (`BB/MB/BSH/BSB`).
- `is_admin` / `is_guru` (profiles): penanda peran.
- `harga_per_anak`, `pesanan.status`, `produk.stok`, `keranjang_item` (badge), `reminder_terkirim` (penanda WA H-1 sudah dikirim).
- `mode_default` (anak): <2 → Mode Ortu, ≥2 → Mode Anak.

---

*Mengikuti kode terkini (sampai Reminder WA + Catatan Perkembangan + Store + Logo). Regenerasi PDF: `python tools/md2pdf.py docs/DOKUMENTASI-KIDZPLAYFUL.md` lalu cetak HTML→PDF via Chrome.*
