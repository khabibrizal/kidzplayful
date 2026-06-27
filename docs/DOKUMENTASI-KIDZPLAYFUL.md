# Dokumentasi Teknis — KidzPlayful

Dokumen ini menjelaskan **seluruh alur** aplikasi KidzPlayful dari nol sampai deploy: arsitektur, tiap berkas & perannya, parameter penting, skema database, serta cara deploy ke **Vercel** (frontend) dan **Supabase** (backend). Tujuannya agar Anda paham FE & BE secara menyeluruh.

- **Aplikasi:** web app kelas bermain digital anak 0–4 tahun (game sensorik/motorik, kelas bermain, video, komunitas, **event offline berbayar**).
- **Repo:** `github.com/khabibrizal/kidzplayful` · **Live:** `https://kidzplayful-fe2a.vercel.app`
- **Stack:** Next.js 16 (App Router, TypeScript) + Supabase (Postgres + Auth + Storage). Tanpa server backend terpisah — "backend" = Supabase + Server Actions/Server Components Next.js.
- **Status fitur (per dokumen ini):** Auth+Trial, Mode Anak (game, video, kelas bermain), Mode Ortu 0-2, Pilih Game, Area Ortu (kelola anak + laporan), Pengaturan (PIN, ganti sandi, logout, nama), Komunitas, Admin (tema/paket, video, kelas bermain, langganan, laporan, komunitas, **event**), **Favorit**, **Event Kelas Bermain offline + pendaftaran**.

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
   │  panggil via @supabase/ssr (pakai cookie sesi)
   ▼
Supabase (cloud)                            ← "Backend"
   ├─ Auth      : akun & sesi (email+password)
   ├─ Postgres  : tabel data + RLS (keamanan baris) + trigger/function
   └─ Storage   : file (gambar game, worksheet PDF, gambar event, bukti bayar) di bucket 'aset'
```

**Konsep kunci:** tidak ada "server Express/Node" terpisah. Logika server berjalan **di dalam Next.js** (Server Components untuk baca, Server Actions untuk tulis), dan **keamanan data utama ada di Supabase RLS** (Row Level Security) — aturan di database yang menentukan baris mana boleh dibaca/ditulis oleh siapa.

---

## 2. Tech Stack & Alasan

| Teknologi | Untuk apa | Kenapa |
|---|---|---|
| **Next.js 16 (App Router)** | Framework FE + server | Satu kerangka untuk UI + server logic; deploy mudah ke Vercel |
| **TypeScript** | Bahasa | Tipe data → lebih sedikit bug |
| **Supabase** | Auth + Database + Storage | Backend siap pakai (Postgres + RLS), gratis untuk mulai |
| **@supabase/ssr** | Hubungkan Next.js ↔ Supabase | Mengelola sesi login lewat cookie (server & browser) |
| **Vitest** | Unit test (logika murni) | Cepat, untuk fungsi di `lib/domain` |
| **Playwright / puppeteer-core** | E2E & skrip verifikasi prod | Uji alur nyata di browser |
| **Vercel** | Hosting frontend | Auto-deploy tiap `git push` |
| **CSS (global + module)** | Styling | Ringan; tema pastel + maskot Pewi |

---

## 3. Menjalankan di Lokal

Prasyarat: **Node.js 20+**, akun **Supabase**, file `.env.local`.

```bash
cd d:\kidzplayful
npm install                 # pasang dependency
# buat .env.local (lihat bagian 4)
npm run dev                 # jalan di http://localhost:3000
npm test                    # unit test (Vitest)
npm run e2e                 # end-to-end test (Playwright)
npm run build               # build produksi (cek error)
npm run lint                # ESLint
```

Script (`package.json`): `dev` (next dev), `build` (next build), `start` (next start), `test`/`test:watch` (Vitest), `e2e` (Playwright).

---

## 4. Variabel Lingkungan (`.env.local`)

File `.env.local` (TIDAK ikut ke Git — rahasia). Di Vercel diisi di **Settings → Environment Variables**.

| Variabel | Untuk apa | Contoh |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Alamat proyek Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci **publishable** (aman dipakai di browser) | `sb_publishable_...` |

> **Penting:** awalan `NEXT_PUBLIC_` membuat variabel **disuntik ke bundel browser saat build** — jadi harus ada **sebelum build** (di Vercel & lokal). Kunci publishable aman karena keamanan sebenarnya dijaga oleh **RLS** di Supabase. **JANGAN** memakai *secret key* di sini.

---

## 5. Konsep Next.js yang Dipakai (wajib paham)

- **Server Component** (default, `page.tsx`/`layout.tsx` tanpa `'use client'`): jalan **di server**, boleh `await` ambil data dari Supabase, aman. Untuk halaman yang membaca data.
- **Client Component** (`'use client'`): jalan **di browser**, punya `useState`/`onClick`. Untuk form, tombol, game, carousel.
- **Server Action** (`'use server'`): fungsi yang jalan **di server** tapi dipanggil dari Client Component — untuk **menulis** data dengan aman (insert/update/delete).
- **`params` & `searchParams`**: di Next 16 berupa **Promise** → harus `await`. `params` = bagian URL dinamis (`[id]`), `searchParams` = query (`?paket=...`).
- **`redirect()`**: pindah halaman dari server (guard).
- **`revalidatePath('/...')`**: setelah menulis data, minta Next mengambil ulang halaman itu (data segar). Dipakai mis. setelah toggle favorit/daftar event agar badge ter-update.
- **`useRouter().push()/refresh()`**: navigasi & refresh dari Client (mis. redirect ke dashboard setelah daftar event).
- **`proxy.ts`** (dulu `middleware.ts`): jalan tiap request untuk **menyegarkan cookie sesi** Supabase.

Rute = struktur folder di `src/app/`. Folder `[x]` = parameter dinamis. `page.tsx` = halaman, `layout.tsx` = kerangka pembungkus.

---

## 6. Supabase (Backend) — Konsep

- **Auth:** menyimpan user (email+password) & sesi. Saat daftar, trigger membuat `profiles` + `langganan` trial.
- **Postgres + RLS:** tiap tabel punya **policy** yang menentukan siapa boleh `select/insert/update/delete` baris mana. RLS = lapisan keamanan utama.
- **Fungsi `public.is_admin()`:** `true` bila user saat ini admin (cek `profiles.is_admin`). Dipakai di policy admin.
- **Storage:** bucket `aset` (publik baca). Tulis: **admin** untuk aset game/worksheet/gambar event; **user** hanya untuk folder `bukti/` (bukti bayar event).
- **Dua client Supabase:**
  - `src/lib/supabase/client.ts` → **browser** (`createBrowserClient`), di Client Component.
  - `src/lib/supabase/server.ts` → **server** (`createServerClient`, baca cookie), di Server Component & Server Action.

---

## 7. Skema Database (per tabel)

Diterapkan lewat **migrasi** `supabase/migrations/0001..0017` (file SQL, dijalankan berurutan di Supabase SQL Editor).

### `profiles` (0001; +is_admin 0004; +nama_tampilan 0010; +no_wa 0015) — profil orang tua (1-1 dgn `auth.users`)
| Kolom | Arti |
|---|---|
| `id` (uuid, PK = auth.users.id) | identitas user |
| `email` | email login |
| `pin_ortu` | PIN 4 angka Gerbang Orang Tua |
| `is_admin` (bool) | penanda admin (default false) |
| `nama_tampilan` | nama (dipakai sapaan "Hai Kak {nama}" & komunitas) |
| `no_wa` | nomor WhatsApp (diisi saat registrasi) |
| `terakhir_aktif`, `created_at` | waktu |

RLS: user baca/ubah **profil sendiri**; admin baca semua. **Trigger `cegah_self_admin` (0012):** user biasa **tak bisa** mengubah `is_admin` sendiri.

### `anak` (0001) — profil anak
`id, ortu_id(FK profiles), nama, tanggal_lahir, mode_default('ortu'|'anak'), batas_menit, koin, created_at`. RLS: hanya milik ortu.

### `langganan` (0001; +nominal 0004) — langganan per ortu (1-1)
`id, ortu_id, status, nominal, trial_mulai, trial_selesai, aktif_sampai, dibayar_via, diaktifkan_oleh, updated_at`. RLS: baca milik sendiri; admin baca + update. **Trigger `handle_new_user` (0001):** saat daftar → buat profiles + langganan trial 14 hari.

### `tema` (0002) — tema mingguan
`id, nama, sampul(emoji), status('draf'|'disetujui'), is_minggu_ini, jadwal_tayang`. RLS: baca disetujui; admin kelola.

### `paket_aset` (0002; +usia 0005) — 1 game per tema
`id, tema_id, mesin, judul, area_skill, usia_min, usia_max, sumber, status, butir(jsonb), urutan`. **`butir`** = JSON soal/aset game.

### `hasil_main` (0002) — log skor sesi main
`id, anak_id, tema_id, mesin, area_skill, jumlah_coba, selesai, durasi_detik, bintang, tanggal`. RLS: milik anak dari ortu login.

### `video` (0003; +kategori 0005) — Pojok Video
`id, tema_id(nullable), judul, youtube_id, durasi_detik, urutan, link_ok, kategori('baby'|'toddler'), status`. RLS: baca disetujui; admin kelola.

### `kelas_bermain` (0014; **direstrukturisasi 0016**) — materi kelas bermain mandiri
| Kolom | Arti |
|---|---|
| `id` | identitas |
| `judul` | judul kelas |
| `bahan` (**jsonb**) | **array** `[{nama, link}]` — tiap bahan boleh punya **link marketplace** (opsional) → tombol 🛒 Beli |
| `aktivitas` (**jsonb**) | **array** `[{judul, cara_membuat, langkah[]}]` — satu kelas bisa banyak aktivitas, tiap aktivitas punya langkahnya sendiri |
| `link_ide` | URL referensi ide |
| `worksheet_url` | URL PDF worksheet (di Storage) |
| `status` | 'aktif' \| 'nonaktif' |

> Migrasi 0016 mengubah `bahan` text→jsonb dan `aktivitas` text→jsonb, lalu **menghapus** kolom lama `cara_membuat` & `langkah` (dilebur ke dalam `aktivitas`). RLS: baca yang `aktif`; admin kelola.

### `favorit` (0015) — favorit kelas bermain (per akun ortu)
`ortu_id(FK profiles), kelas_id(FK kelas_bermain), created_at` — **primary key gabungan (ortu_id, kelas_id)** (1 favorit unik per ortu+kelas). RLS: `for all ... using (ortu_id = auth.uid())` — hanya milik sendiri.

### `event` (0017) — event kelas bermain offline
| Kolom | Arti |
|---|---|
| `id` | identitas |
| `judul`, `lokasi`, `deskripsi` | info event |
| `tanggal` (date), `jam_mulai`, `jam_selesai` (text) | waktu event |
| `gambar_url` | poster event (di Storage) |
| `harga_per_anak` (int) | harga; total = harga × jumlah anak |
| `status` | 'tampil' \| 'arsip' |
RLS: baca yang `tampil` (atau admin); kelola admin.

### `pendaftaran_event` (0017) — pendaftaran event oleh ortu
| Kolom | Arti |
|---|---|
| `id` | identitas |
| `event_id`, `ortu_id` | relasi |
| `anak_ids` (uuid[]), `anak_nama` (text[]) | anak yang didaftarkan (+ snapshot nama agar admin lihat tanpa join) |
| `jumlah_anak`, `total` | hasil hitung (server) |
| `bukti_url` | bukti bayar (Storage `bukti/`) |
| `status` | 'menunggu' \| 'diterima' \| 'ditolak' |
RLS: ortu baca/insert **milik sendiri**; **admin** baca semua + update status (Terima/Tolak).

**Storage policy (0017):** authenticated boleh **insert** ke bucket `aset` **khusus folder `bukti/`** (bukti bayar). Aset lain tetap admin-only (0007).

**Daftar migrasi (urut jalankan):** 0001 init → 0002 konten → 0003 video+tema2 → 0004 admin → 0005 video kategori → 0006 admin bisnis → 0007 storage → 0008 panduan → 0009 kelas bermain (field) → 0010 komunitas → 0011 moderasi → 0012 cegah self-admin → 0013 field kelas → 0014 kelas_bermain → **0015 favorit (+no_wa)** → **0016 kelas bahan/aktivitas jsonb** → **0017 event + pendaftaran**.

---

## 8. Struktur Folder & Peran Tiap Berkas

### `src/lib/supabase/` — koneksi Supabase
- `client.ts` — Supabase client **browser**. `server.ts` — Supabase client **server** (baca cookie).

### `src/lib/domain/` — logika murni (tanpa DB, mudah diuji)
trial.ts, anak.ts, usia.ts, skor.ts, waktu.ts, laporan.ts, laporan-anak.ts (+ `__tests__/` Vitest, 30 test).

### `src/lib/game/` — tipe & util game
- `tipe.ts` — semua interface: Paket, Video, KelasBermain, **BahanItem**, **AktivitasItem**, **EventKelas**, **PendaftaranEvent**, dll.
- `butir.ts`, `aset.ts` — validasi/util.

### `src/lib/` — util umum
- **`format.ts`** — `formatTanggal(iso)` (mis. "Sabtu, 18 Mei 2024") & `formatRupiah(n)` ("Rp 50.000").

### `src/lib/data/` — lapisan data (baca = fungsi; tulis = Server Action `'use server'`)
| Berkas | Isi |
|---|---|
| `anak.ts` | `getAnakTerjamin(anakId)` — ambil anak + guard login/langganan |
| `pustaka.ts`, `tema.ts`, `video.ts` | baca konten game/tema/video |
| `skor.ts` | `catatHasil(...)` simpan hasil_main + koin |
| `kelas-bermain.ts` | `getKelasAktif()` / `getKelasSemua()` |
| `kelas-bermain-actions.ts` | CRUD kelas (KelasInput: **BahanInput[]**, **AktivitasInput[]**) |
| **`favorit.ts`** | `getFavoritIds()`, `getFavoritKelas()` |
| **`favorit-actions.ts`** | `toggleFavorit(kelasId)` |
| **`event.ts`** | `getEventTampil()`, `getEvent(id)`, `getStatusPendaftaranSaya()` |
| **`event-actions.ts`** | `daftarEvent(eventId, anakIds[], buktiUrl)` — hitung total di server |
| **`admin-event.ts`** | `getEventSemua()`, `getEventAdmin(id)`, `getJumlahPendaftar()`, `getPendaftaranByEvent(id)` |
| **`admin-event-actions.ts`** | CRUD event (EventInput) + `setStatusPendaftaran(id, status)` |
| `admin.ts`, `admin-konten.ts`, `admin-bisnis.ts`, `admin-komunitas.ts` | guard admin + CRUD tema/paket/video/panduan, aktivasi langganan, moderasi |
| `ortu-actions.ts` | updateAnak/setBatas/hapusAnak/setPin |
| `komunitas.ts`, `komunitas-actions.ts` | feed + posting/komentar/suka/lapor/nama |

> **Pola guard "milik sendiri":** semua query difilter `.eq('id'/'ortu_id', user.id)` agar aman & tidak error untuk admin (yang bisa baca banyak baris). Action admin pakai `adminDb()` (cek `is_admin`).

### `src/components/` — komponen UI dipakai ulang
- `ui/Pewi.tsx` (maskot), `ui/Confetti.tsx`.
- `game/` — GameRunner, ManaYa, BeresBeres, CariPasangan, Aset, Reward, PinGate, VideoPojok.
- `admin/AsetInput.tsx` — input aset game (emoji/upload).
- **`FavoritBtn.tsx`** — toggle ❤️/🤍 (optimistic + Server Action).
- **`BeliBtn.tsx`** — tombol 🛒 Beli bahan + **modal konfirmasi** sebelum membuka marketplace (aman untuk layar anak).
- **`UnduhPdfBtn.tsx`** — Unduh PDF kelas bermain (dialog cetak browser; set `document.title` jadi nama file).
- **`EventCard.tsx`** — kartu event (gambar, info, harga) + **badge status** (Menunggu/Diterima/Ditolak) atau tombol Daftar.
- **`EventCarousel.tsx`** — carousel event di dashboard (scroll-snap + titik indikator + "Lihat semua").

### `src/app/` — halaman (rute)
| Rute | Berkas | Untuk |
|---|---|---|
| `/` | `page.tsx` | Landing (Pewi + Mulai/Masuk) |
| `/daftar`, `/login` | — | Auth. **Daftar** kini minta **Nama + No WhatsApp** (disimpan ke profil) |
| `/pilih-anak` | `page.tsx` + `actions.ts` | Dashboard ortu: sapaan **"Hai Kak {nama}"**, tombol **❤️ Favoritmu**, **carousel Event**, daftar/tambah anak, tautan ke Kelola/PilihGame/Pengaturan/Komunitas |
| `/favorit` | `page.tsx` | Daftar kelas bermain favorit (+ unfavorite) |
| `/kelas/[id]` | `page.tsx` | Detail kelas bermain (sisi ortu) + **⬇ Unduh PDF** + 🛒 Beli bahan |
| `/main/[anakId]` | `page.tsx` + `MenuAnak.tsx` | **Mode Anak**: sapaan nama anak, **Main Hari Ini** (kelas bermain + ❤️ favorit + 🛒 Beli + Unduh PDF), Game Edukasi, Pojok Video, tombol **👨‍👩‍👧 Mode Orang Tua** (PIN→dashboard) |
| `/ortu/[anakId]` | `page.tsx` | **Mode Ortu 0-2**: kelas bermain (bahan+Beli, aktivitas, Unduh PDF) + video baby |
| `/anak/[anakId]` (+`/laporan`) | — | Kelola profil anak + laporan perkembangan |
| `/pilih-game/[anakId]` | — | Rekomendasi game sesuai usia (deep-link `?paket=`) |
| `/pengaturan` | `page.tsx` + form | PIN, **ganti sandi**, **logout**, nama tampilan, langganan |
| `/komunitas` (+`/[postId]`) | — | Forum ortu |
| `/event` | `page.tsx` | Daftar semua event (kartu + badge status) |
| `/event/[id]/daftar` | `page.tsx` + `DaftarForm.tsx` | **Pendaftaran**: info event, checklist anak (>1), total otomatis, upload bukti bayar → redirect ke dashboard |
| `/admin` | `layout.tsx` (guard + **tombol Keluar**) + `page.tsx` (nav) | Dashboard admin |
| `/admin/tema/[id]`, `/admin/video`, `/admin/langganan`, `/admin/laporan`, `/admin/komunitas` | — | Kelola konten/bisnis/moderasi |
| `/admin/kelas-bermain` | `page.tsx` + `KelasAdmin.tsx` | CRUD kelas: **repeater Bahan (nama+link)** & **repeater Aktivitas (judul+cara membuat+langkah)** |
| `/admin/event` | `page.tsx` + `EventAdmin.tsx` | CRUD event (judul, lokasi, tanggal, jam, harga/anak, deskripsi, upload gambar) |
| `/admin/event/[id]/pendaftar` | `page.tsx` + `PendaftarAdmin.tsx` | Lihat pendaftar (nama anak, total, bukti) + **Terima/Tolak** |
| `/admin/LogoutBtn.tsx` | — | Tombol keluar admin (client) |
| `globals.css` | — | Token pastel + kelas `kp-*` + `@media print .no-print` (untuk Unduh PDF) |
| `layout.tsx`, `error.tsx`, `not-found.tsx`, `proxy.ts` | — | Root/font, error/404, penyegar sesi |

---

## 9. Alur Fitur (FE ↔ BE)

**Daftar → Trial:** `/daftar` (Client) `signUp` → trigger buat profiles+langganan trial → lalu **update profil dengan Nama + No WA** → redirect `/pilih-anak` (Server baca status via `statusLangganan`, sapa "Hai Kak {nama}").

**Main game:** `/main/[anakId]` (Server) ambil anak + pustaka + kelas + **favoritIds** → `MenuAnak` (Client) jalankan engine via `GameRunner` → selesai → `catatHasil` (hasil_main + koin) → Reward.

**Favorit:** di Mode Anak (Main Hari Ini) tap 🤍→❤️ (`toggleFavorit`, per akun ortu) → muncul di **/favorit** (dibuka dari tombol "❤️ Favoritmu" di dashboard) → bisa di-unfavorite dari sana.

**Kelas Bermain (struktur baru):** admin isi **Bahan** (tiap baris nama + link toko opsional) & **Aktivitas** (tiap aktivitas judul + cara membuat + langkah sendiri). User melihatnya sebagai daftar bahan (tombol **🛒 Beli** → konfirmasi → buka marketplace) + kartu per aktivitas, dan bisa **⬇ Unduh PDF**.

**Event (pendaftaran):** admin buat event (harga/anak) → tampil di **carousel dashboard** & **/event**. User klik **Daftar Sekarang** → pilih anak (>1), **total = harga × jumlah anak** (dihitung ulang di server), upload **bukti bayar** → `daftarEvent` simpan `pendaftaran_event` (status `menunggu`) → **redirect ke dashboard**, kartu event menampilkan **badge status**. Admin di **/admin/event/[id]/pendaftar** lihat pendaftar + **Terima/Tolak** → badge user berubah (Diterima/Ditolak).

---

## 10. Keamanan

1. **RLS di setiap tabel** — penentu utama siapa boleh apa.
2. **Guard di kode** — `getAnakTerjamin`, `getAdminTerjamin`, `adminDb()`.
3. **`is_admin()` + trigger anti self-promote (0012)** — admin hanya via SQL Editor.
4. **Query "milik sendiri" difilter `.eq(..user.id)`** — cegah error & kebocoran untuk admin.
5. **Total event dihitung ulang di server** — anti manipulasi harga dari client.
6. **Upload user dibatasi** — user hanya boleh unggah ke folder `bukti/`; aset lain admin-only.
7. **Privasi anak** — Mode Anak tanpa iklan; tombol 🛒 Beli & keluar dilindungi konfirmasi/PIN; video `youtube-nocookie`.

---

## 11. Testing & Verifikasi

- **Unit (Vitest):** `npm test` — `src/lib/domain/*` & `src/lib/game/*` (30 test).
- **E2E (Playwright):** `npm run e2e`.
- **Skrip verifikasi prod (`tools/*.mjs`, puppeteer):** mis. `kelas_m13_check.mjs` (form kelas skema baru), `event_m14_full.mjs` (buat event → daftar → admin Terima → badge → cleanup). Jalankan: `node tools/<nama>.mjs`.

---

## 12. Deploy — Supabase (Backend)

1. Buat proyek di **supabase.com**.
2. **SQL Editor** → jalankan migrasi `0001` s/d `0017` **berurutan**.
3. **Authentication → Email** → matikan "Confirm email" (dev) / atur SMTP (produksi). Set **Site URL** = domain Vercel.
4. **Project Settings → API** → salin **Project URL** + **publishable key** → ke env Vercel & `.env.local`.
5. **Beri admin** (sekali): `update public.profiles set is_admin=true where email='EMAIL_ANDA';`
6. Bucket `aset` dibuat oleh migrasi 0007; izin upload bukti oleh 0017.

## 13. Deploy — Vercel (Frontend)

1. Push repo ke **GitHub**.
2. vercel.com → **Add New → Project → Import** repo (Next.js auto-detect).
3. **Environment Variables** (Production+Preview+Development) isi 2 variabel **sebelum** Deploy.
4. **Deploy.** Selanjutnya **tiap `git push` ke `master` → auto-deploy**.
5. **Plan Hobby:** auto-deploy repo **private** diblokir → solusi kita: repo dibuat **public**.

Alur rilis: `git add -A && git commit -m "..." && git push origin master`. Bila skema berubah: tulis migrasi baru `00NN_*.sql` lalu jalankan di Supabase SQL Editor.

---

## 14. Masalah yang Pernah Terjadi & Solusi

| Masalah | Sebab | Solusi |
|---|---|---|
| Deploy "Blocked" di Vercel | Hobby + repo private | Repo dijadikan public |
| Login admin malah ke /pilih-anak | Admin baca semua baris → `.single()` error | Filter `.eq('id', user.id)` di query profil/langganan |
| User bisa jadi admin sendiri | RLS profil mengizinkan ubah `is_admin` | Trigger `cegah_self_admin` (0012) |
| **Migrasi 0016 error `cannot use subquery in transform expression`** | Subquery di `ALTER COLUMN ... USING` (konversi bahan) tidak diizinkan | Konversi `bahan` via **kolom sementara + `UPDATE`** (subquery boleh di UPDATE) |
| Badge status event tak muncul saat uji | Skrip jalan sebelum deploy live | Tunggu deploy ~1–2 menit lalu uji ulang |
| Warning "middleware deprecated" | Next 16 | Rename `middleware.ts` → `proxy.ts` |

---

## 15. Glosarium Parameter Penting

- **`butir` (paket_aset, jsonb):** isi game per tema (1 engine, banyak tema).
- **`bahan` (kelas_bermain, jsonb):** `[{nama, link}]` — `link` ada → tombol 🛒 Beli.
- **`aktivitas` (kelas_bermain, jsonb):** `[{judul, cara_membuat, langkah[]}]` — banyak aktivitas/kelas.
- **`favorit` (PK ortu_id+kelas_id):** favorit unik per akun ortu.
- **`harga_per_anak` (event):** total = harga × jumlah anak (dihitung server).
- **`anak_nama` (pendaftaran_event, text[]):** snapshot nama anak agar admin lihat tanpa join.
- **`status` (pendaftaran_event):** menunggu/diterima/ditolak → badge di kartu event user.
- **`status` (event):** tampil/arsip (kontrol muncul di carousel & list).
- **`mode_default` (anak):** <2 → Mode Ortu, ≥2 → Mode Anak.
- **`batas_menit` (anak):** batas screen-time harian (localStorage `kunciHari`).

---

*Dokumen ini mengikuti kode terkini (sampai fitur Event M14). Bila ada perubahan besar, perbarui `docs/DOKUMENTASI-KIDZPLAYFUL.md` lalu regenerasi PDF dengan `tools/md2pdf.py` + Chrome `--print-to-pdf`.*
