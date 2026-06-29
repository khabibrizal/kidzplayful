# Dokumentasi Teknis — KidzPlayful

Dokumen ini menjelaskan **seluruh alur** aplikasi KidzPlayful dari nol sampai deploy: arsitektur, tiap berkas & perannya, parameter penting, skema database, serta cara deploy ke **Vercel** (frontend) dan **Supabase** (backend). Tujuannya agar Anda paham FE & BE secara menyeluruh.

- **Aplikasi:** web app kelas bermain digital anak 0–4 tahun (game sensorik/motorik, kelas bermain, video, komunitas, **event offline berbayar**, dan **toko/Store** mainan & bahan activity).
- **Repo:** `github.com/khabibrizal/kidzplayful` · **Live:** `https://kidzplayful-fe2a.vercel.app`
- **Stack:** Next.js 16 (App Router, TypeScript) + Supabase (Postgres + Auth + Storage). Tanpa server backend terpisah — "backend" = Supabase + Server Actions/Server Components Next.js.
- **Status fitur:** Auth + Trial + **Lupa Password**, Mode Anak (game, video, kelas bermain), Mode Ortu 0-2, Pilih Game, Area Ortu (kelola anak + laporan), Pengaturan (PIN, ganti sandi, logout, nama), Komunitas, **Favorit**, **Event** offline + pendaftaran, **Store** (produk, keranjang, pesanan), **Bottom navigation** + **Riwayat Kelas Bermain**, dan Admin (tema/paket, video, kelas bermain, langganan, laporan, komunitas, event, produk, pesanan).

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
   ├─ Auth      : akun & sesi (email+password) + reset password
   ├─ Postgres  : tabel data + RLS (keamanan baris) + trigger/function
   └─ Storage   : file (gambar game, worksheet, gambar event, foto produk, bukti bayar) di bucket 'aset'
```

**Konsep kunci:** tidak ada server terpisah. Logika server berjalan **di dalam Next.js** (Server Components baca, Server Actions tulis), dan **keamanan data utama ada di Supabase RLS** (Row Level Security) — aturan database yang menentukan baris mana boleh dibaca/ditulis siapa.

---

## 2. Tech Stack & Alasan

| Teknologi | Untuk apa | Kenapa |
|---|---|---|
| **Next.js 16 (App Router)** | Framework FE + server | Satu kerangka UI + server logic; deploy mudah ke Vercel |
| **TypeScript** | Bahasa | Tipe data → lebih sedikit bug |
| **Supabase** | Auth + Database + Storage | Backend siap pakai (Postgres + RLS) |
| **@supabase/ssr** | Hubungkan Next.js ↔ Supabase | Mengelola sesi login lewat cookie |
| **Vitest** | Unit test (logika murni) | Cepat, untuk `lib/domain` |
| **Playwright / puppeteer-core** | E2E & skrip verifikasi prod | Uji alur nyata di browser |
| **Vercel** | Hosting frontend | Auto-deploy tiap `git push` |
| **CSS (global + module)** | Styling | Ringan; tema pastel + maskot Pewi |

---

## 3. Menjalankan di Lokal

Prasyarat: **Node.js 20+**, akun **Supabase**, file `.env.local`.

```bash
cd d:\kidzplayful
npm install
npm run dev      # http://localhost:3000
npm test         # unit test (Vitest)
npm run e2e      # end-to-end (Playwright)
npm run build    # build produksi (cek error)
npm run lint     # ESLint
```

---

## 4. Variabel Lingkungan (`.env.local`)

| Variabel | Untuk apa | Contoh |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Alamat proyek Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci **publishable** (aman di browser) | `sb_publishable_...` |

> Awalan `NEXT_PUBLIC_` membuat variabel **disuntik ke bundel browser saat build** → harus ada **sebelum build**. Kunci publishable aman karena keamanan dijaga oleh **RLS**. **JANGAN** pakai *secret key*.

---

## 5. Konsep Next.js yang Dipakai

- **Server Component** (default): jalan di server, baca data, aman.
- **Client Component** (`'use client'`): interaktif (useState/onClick) — form, tombol, game, carousel, bottom nav.
- **Server Action** (`'use server'`): fungsi tulis di server, dipanggil dari client.
- **`params`/`searchParams`**: Promise di Next 16 → harus `await`.
- **`redirect()`**: pindah halaman dari server (guard).
- **`revalidatePath('/...')`**: minta Next ambil ulang data halaman setelah menulis.
- **`useRouter().push()/refresh()`**: navigasi/refresh dari client.
- **`proxy.ts`** (dulu `middleware.ts`): segarkan cookie sesi tiap request.

Rute = struktur folder `src/app/`. `[x]` = parameter dinamis.

---

## 6. Supabase (Backend) — Konsep

- **Auth:** user (email+password) & sesi. Daftar → trigger buat `profiles` + `langganan` trial. **Reset password** via `resetPasswordForEmail` → email tautan → halaman set sandi baru (`updateUser`).
- **Postgres + RLS:** tiap tabel punya policy. RLS = lapisan keamanan utama.
- **`public.is_admin()`:** `true` bila user admin. Dipakai di policy admin.
- **Storage** (bucket `aset`, publik baca): tulis **admin** untuk aset game/worksheet/gambar event/foto produk (folder `produk/`, `event/`, `worksheet/`); tulis **user** hanya folder `bukti/` (bukti bayar event & pesanan).
- **Dua client:** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server, baca cookie).

---

## 7. Skema Database (per tabel)

Migrasi `supabase/migrations/0001..0019` (dijalankan berurutan di Supabase SQL Editor).

### `profiles` (0001; +is_admin 0004; +nama_tampilan 0010; +no_wa 0015)
`id(PK=auth.users.id), email, pin_ortu, is_admin, nama_tampilan, no_wa, created_at`. RLS: profil sendiri; admin baca semua. **Trigger `cegah_self_admin` (0012):** user tak bisa jadikan diri admin.

### `anak` (0001)
`id, ortu_id, nama, tanggal_lahir, mode_default('ortu'|'anak'), batas_menit, koin`. RLS milik ortu.

### `langganan` (0001; +nominal 0004)
`id, ortu_id, status, nominal, trial_mulai, aktif_sampai, ...`. **Trigger `handle_new_user`** buat profiles+langganan trial 14 hari saat daftar.

### `tema` (0002) · `paket_aset` (0002; +usia 0005) · `hasil_main` (0002) · `video` (0003; +kategori 0005)
Konten game/tema/skor/video. `paket_aset.butir` (jsonb) = isi game. `video`: youtube_id, kategori baby/toddler.

### `kelas_bermain` (0014; **restruktur 0016**; +link produk Store)
| Kolom | Arti |
|---|---|
| `id`, `judul` | identitas + judul |
| `bahan` (**jsonb**) | array `[{nama, link, produk_id}]` — `link` = toko **luar** opsional, `produk_id` = produk **Store internal** opsional (diutamakan) → tombol 🛒 Beli |
| `aktivitas` (**jsonb**) | array `[{judul, cara_membuat, langkah[]}]` — banyak aktivitas, tiap aktivitas punya langkah sendiri |
| `link_ide`, `worksheet_url`, `status('aktif'|'nonaktif')` | referensi + PDF + status |

### `favorit` (0015)
`ortu_id, kelas_id, created_at` — **PK gabungan (ortu_id, kelas_id)**. RLS milik sendiri. Favorit kelas bermain per akun.

### `riwayat_kelas` (0018)
`ortu_id, kelas_id, terakhir` — **PK gabungan**. RLS milik sendiri. Dicatat tiap user membuka detail kelas → menu **🎈 Kelas Bermain** (riwayat).

### `event` (0017) · `pendaftaran_event` (0017)
- `event`: judul, lokasi, tanggal, jam_mulai/selesai, deskripsi, gambar_url, **harga_per_anak**, status(tampil/arsip). RLS baca tampil/admin; kelola admin.
- `pendaftaran_event`: event_id, ortu_id, **anak_ids[]**, **anak_nama[]** (snapshot), jumlah_anak, total, bukti_url, status(menunggu/diterima/ditolak). RLS milik sendiri + admin update.

### `produk` (0019) — Store
`id, nama, deskripsi, kategori, harga, stok, gambar_url, status('tampil'|'arsip')`. RLS baca tampil/admin; kelola admin.

### `keranjang_item` (0019)
`ortu_id, produk_id, qty` — **unique (ortu_id, produk_id)**. RLS milik sendiri. Keranjang tersimpan di DB.

### `pesanan` (0019)
`id, ortu_id, status, subtotal, ongkir, total, penerima, no_hp, alamat, bukti_url, no_resi, catatan, created_at`. **Status:** menunggu_ongkir → menunggu_bayar → dibayar → diproses → dikirim → selesai (atau batal). RLS: baca/insert/update milik sendiri + admin update.

### `item_pesanan` (0019)
`pesanan_id, produk_id, nama, harga, qty` (nama/harga di-*snapshot*). RLS via relasi pesanan.

**Urutan migrasi:** 0001 init → 0002 konten → 0003 video → 0004 admin → 0005 video kategori → 0006 admin bisnis → 0007 storage → 0008–0009 panduan → 0010–0011 komunitas → 0012 cegah self-admin → 0013–0014 kelas_bermain → **0015 favorit (+no_wa)** → **0016 kelas bahan/aktivitas jsonb** → **0017 event** → **0018 riwayat_kelas** → **0019 store**.

---

## 8. Struktur Folder & Peran Tiap Berkas

### `src/lib/supabase/` — `client.ts` (browser), `server.ts` (server).
### `src/lib/domain/` — logika murni (trial, anak, usia, skor, waktu, laporan, laporan-anak) + `__tests__/` (30 test).
### `src/lib/game/tipe.ts` — semua interface: Paket, Video, KelasBermain, **BahanItem** (+produk_id), AktivitasItem, EventKelas, PendaftaranEvent, **Produk, KeranjangItem, Pesanan, ItemPesanan, StatusPesanan**.
### `src/lib/format.ts` — `formatTanggal`, `formatRupiah`, `STATUS_PESANAN` (label+warna status).

### `src/lib/data/` — lapisan data (baca = fungsi; tulis = Server Action)
| Berkas | Isi |
|---|---|
| `anak.ts`, `pustaka.ts`, `tema.ts`, `video.ts`, `skor.ts` | konten anak/game/video + catat skor |
| `kelas-bermain.ts` / `kelas-bermain-actions.ts` | baca + CRUD kelas (Bahan: nama/link/**produk_id**) |
| `favorit.ts` / `favorit-actions.ts` | favorit + toggleFavorit |
| `riwayat-kelas.ts` / `riwayat-actions.ts` | `getRiwayatKelas`, `rekamRiwayat` + `catatRiwayatKelas` (client) |
| `event.ts` / `event-actions.ts` | event + daftarEvent + getStatusPendaftaranSaya |
| `admin-event.ts` / `admin-event-actions.ts` | admin event + Terima/Tolak |
| **`store.ts`** | getProdukTampil, getProduk |
| **`keranjang.ts`** | getKeranjang, **getJumlahKeranjang** (badge) |
| **`keranjang-actions.ts`** | tambah/setQty/hapus, **checkout**, jumlahKeranjang |
| **`pesanan.ts`** / **`pesanan-actions.ts`** | pesanan user + uploadBuktiPesanan |
| **`admin-store.ts`** / **`admin-store-actions.ts`** | admin produk+pesanan + CRUD/setOngkir/verifikasi/setResi |
| `admin*.ts`, `ortu-actions.ts`, `komunitas*.ts` | konten/bisnis/moderasi, kelola anak, forum |

> **Pola guard:** query "milik sendiri" difilter `.eq(..user.id)`; action admin pakai `adminDb()` (cek `is_admin`). Total/harga dihitung ulang di server (anti manipulasi).

### `src/components/`
- `ui/Pewi`, `ui/Confetti`, `game/*` (GameRunner, ManaYa, BeresBeres, CariPasangan, Aset, Reward, PinGate, VideoPojok), `admin/AsetInput`.
- `FavoritBtn` (❤️ toggle), **`BeliBtn`** (Beli bahan: internal produk Store ATAU link luar, dengan konfirmasi), `UnduhPdfBtn` (cetak PDF kelas), `EventCard`/`EventCarousel`, **`ProdukCard`** (kartu Store), **`TambahKeranjangBtn`**, **`BottomNav`** (navigasi bawah + **badge keranjang**).

### `src/app/` — rute
| Rute | Untuk |
|---|---|
| `/`, `/daftar`, `/login` | Landing + Auth. Daftar minta **Nama + No WA**. Login ada **"Lupa kata sandi?"** |
| `/lupa-sandi`, `/reset-sandi` | Minta tautan reset + set kata sandi baru |
| `/pilih-anak` | Dashboard: sapaan "Hai Kak {nama}", ❤️ Favoritmu, **carousel Event**, profil anak, + BottomNav |
| `/favorit` | Daftar favorit (+ unfavorite) |
| `/kelas-saya` | **Riwayat kelas bermain** yang pernah dibuka (menu 🎈) |
| `/kelas/[id]` | Detail kelas (sisi ortu) + Unduh PDF + 🛒 Beli bahan |
| `/main/[anakId]` | **Mode Anak**: sapaan nama anak, Main Hari Ini, Game, Video, tombol Mode Orang Tua |
| `/ortu/[anakId]` | **Mode Ortu 0-2** |
| `/anak/[anakId]` (+`/laporan`), `/pilih-game/[anakId]` | Kelola anak + laporan + rekomendasi game |
| `/pengaturan` | PIN, ganti sandi, logout, nama, langganan |
| `/komunitas` (+`/[postId]`) | Forum ortu |
| `/event` (+`/[id]/daftar`) | Daftar event + pendaftaran (badge status) |
| **`/store`** (+`/[id]`) | Katalog + detail produk |
| **`/keranjang`** | Keranjang + checkout (alamat) |
| **`/pesanan`** (+`/[id]`) | Riwayat pesanan + detail + upload bukti |
| `/admin` | Dashboard admin (nav + tombol Keluar) |
| `/admin/{tema,video,langganan,laporan,komunitas}` | Kelola konten/bisnis/moderasi |
| `/admin/kelas-bermain` | CRUD kelas (Bahan ↔ produk Store, Aktivitas bergrup) |
| `/admin/event` (+`/[id]/pendaftar`) | CRUD event + kelola pendaftar |
| **`/admin/produk`** | CRUD produk + stok + gambar |
| **`/admin/pesanan`** | Kelola pesanan: set ongkir, verifikasi, resi, status |

`globals.css` (token pastel + `kp-*` + `@media print .no-print`), `layout.tsx`, `error.tsx`, `not-found.tsx`, `proxy.ts`.

---

## 9. Alur Fitur (FE ↔ BE)

**Daftar/Login/Reset:** daftar (`signUp` → update profil Nama+WA) → trial. Login ada **Lupa kata sandi** → `/lupa-sandi` (`resetPasswordForEmail`) → email → `/reset-sandi` (`updateUser`).

**Mode Anak:** ambil anak+pustaka+kelas+favoritIds → main game (`catatHasil` → koin) → Reward. Buka kelas → `catatRiwayatKelas` (riwayat).

**Favorit:** tap 🤍→❤️ (`toggleFavorit`) → muncul di tombol "❤️ Favoritmu" / halaman `/favorit`.

**Kelas Bermain:** admin isi Bahan (nama + pilih produk Store **atau** link luar) & Aktivitas (judul+cara membuat+langkah). User lihat daftar bahan (🛒 Beli → konfirmasi → produk Store internal / marketplace luar) + kartu aktivitas + **⬇ Unduh PDF**.

**Event:** admin buat event (harga/anak) → carousel dashboard & `/event`. User Daftar → pilih anak (>1), total=harga×anak (server), upload bukti → redirect dashboard + badge status. Admin Terima/Tolak.

**Store:** admin CRUD produk. User katalog → detail → **+ Keranjang** (badge di bottom nav update via event `keranjang:update`) → `/keranjang` checkout (alamat) → pesanan `menunggu_ongkir`. Admin **set ongkir** → `menunggu_bayar`; user transfer + **upload bukti** → `dibayar`; admin **verifikasi** (stok −) → `diproses`; admin **set resi** → `dikirim`; **selesai**. Status terlihat user.

**Bottom Nav (6 tab):** 🏠 Beranda · 🎈 Kelas · 🛒 Store (badge jumlah keranjang) · 📦 Pesanan · 💬 Komunitas · 👤 Akun. Tampil di halaman ortu; tidak di Mode Anak/Admin.

---

## 10. Keamanan

1. **RLS tiap tabel** — penentu utama akses.
2. **Guard kode** — getAnakTerjamin, getAdminTerjamin, adminDb, filter `.eq(..user.id)`.
3. **`is_admin()` + trigger anti self-promote (0012)** — admin hanya via SQL Editor.
4. **Total event & pesanan dihitung ulang di server**; harga di-*snapshot* di item_pesanan.
5. **Stok** dikurangi saat admin verifikasi pembayaran (anti oversell).
6. **Upload user dibatasi** folder `bukti/`; aset lain admin-only.
7. **Privasi anak** — 🛒 Beli & keluar selalu lewat konfirmasi/PIN; video `youtube-nocookie`.

---

## 11. Testing & Verifikasi

- **Unit (Vitest):** `npm test` — `lib/domain` & `lib/game` (30 test).
- **E2E (Playwright):** `npm run e2e`.
- **Skrip verifikasi prod (`tools/*.mjs`, puppeteer):** `event_m14_full.mjs` (event), `store_m16_check.mjs` (Store: produk→checkout→ongkir→bukti→verifikasi→stok→resi→cleanup), `kelas_m13_check.mjs`. Jalankan: `node tools/<nama>.mjs`.

---

## 12. Deploy — Supabase

1. Buat proyek di supabase.com.
2. **SQL Editor** → jalankan migrasi `0001`–`0019` berurutan.
3. **Auth → Email**: matikan "Confirm email" (dev) / atur **SMTP** (produksi & agar email reset password terkirim). **URL Configuration → Redirect URLs**: tambahkan `https://<domain>/reset-sandi`. **Site URL** = domain.
4. **API** → salin Project URL + publishable key → env Vercel & `.env.local`.
5. Admin (sekali): `update public.profiles set is_admin=true where email='EMAIL_ANDA';`
6. Bucket `aset` (0007) + izin upload bukti (0017).

## 13. Deploy — Vercel

1. Push ke GitHub. 2. Import project (Next.js auto). 3. Isi 2 env var **sebelum** Deploy. 4. Deploy → tiap `git push master` auto-deploy. 5. **Plan Hobby**: repo dibuat **public** agar auto-deploy jalan.

Rilis: `git add -A && git commit -m "..." && git push origin master`. Skema berubah → tulis `00NN_*.sql` lalu jalankan di Supabase.

---

## 14. Masalah yang Pernah Terjadi & Solusi

| Masalah | Sebab | Solusi |
|---|---|---|
| Deploy "Blocked" Vercel | Hobby + repo private | Repo dibuat public |
| Login admin malah ke /pilih-anak | Admin baca semua baris → `.single()` error | Filter `.eq('id', user.id)` |
| User bisa jadi admin sendiri | RLS profil terlalu longgar | Trigger `cegah_self_admin` (0012) |
| Migrasi 0016 `cannot use subquery in transform expression` | Subquery di `ALTER ... USING` | Konversi `bahan` via kolom sementara + `UPDATE` |
| **Input link YouTube error "tidak valid"** | Ekstraksi hanya kenal v=/youtu.be/embed | Tambah **shorts/live/format lain** + fallback host youtube |
| Badge/redirect tak terlihat saat uji | Skrip jalan sebelum deploy live | Tunggu deploy ~1–2 menit, uji ulang |

---

## 15. Glosarium Parameter Penting

- **`butir` (paket_aset, jsonb):** isi game per tema.
- **`bahan` (kelas_bermain, jsonb):** `[{nama, link, produk_id}]` — `produk_id` → produk Store internal (diutamakan), `link` → toko luar.
- **`aktivitas` (kelas_bermain, jsonb):** `[{judul, cara_membuat, langkah[]}]`.
- **`favorit` / `riwayat_kelas` (PK ortu+kelas):** favorit & riwayat buka kelas per akun.
- **`harga_per_anak` (event):** total = harga × jumlah anak (server).
- **`anak_nama` (pendaftaran_event, text[]):** snapshot nama anak.
- **`produk.stok`:** dikurangi saat admin verifikasi pesanan.
- **`pesanan.status`:** menunggu_ongkir → menunggu_bayar → dibayar → diproses → dikirim → selesai/batal.
- **`item_pesanan.nama/harga`:** snapshot saat checkout (anti perubahan harga).
- **`keranjang_item` (unique ortu+produk):** keranjang DB; total qty → badge bottom nav.
- **`mode_default` (anak):** <2 → Mode Ortu, ≥2 → Mode Anak. **`batas_menit`:** screen-time harian.

---

*Dokumen mengikuti kode terkini (sampai fitur Store M16 + bahan↔Store + badge keranjang). Perbarui `docs/DOKUMENTASI-KIDZPLAYFUL.md` lalu regenerasi PDF: `python tools/md2pdf.py docs/DOKUMENTASI-KIDZPLAYFUL.md` + Chrome `--print-to-pdf`.*
