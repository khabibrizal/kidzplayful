# CLAUDE.md

Panduan untuk Claude Code saat bekerja di repositori ini. Lihat juga **`MEMORY.md`** (peta kode dari knowledge graph) untuk orientasi cepat modul & alur.

## Apa ini

**KidzPlayful** — web app kelas bermain digital anak 0–4 tahun: game sensorik/motorik, kelas bermain, Pojok Video, komunitas ortu, **event offline berbayar + pendaftaran**, **toko/Store** (mainan & bahan activity), **Catatan Perkembangan Bermain** (penilaian guru rubrik PAUD), dan **reminder WhatsApp**.

- **Stack:** Next.js 16 (App Router, TypeScript) + Supabase (Postgres + Auth + Storage). Tidak ada server terpisah — "backend" = Server Components (baca) + Server Actions (tulis) + **RLS** di Supabase.
- **Live:** `https://kidzplayful-fe2a.vercel.app` · **Repo:** `github.com/khabibrizal/kidzplayful` (public, deploy Vercel auto tiap push ke `master`).
- **Bahasa:** semua UI, komentar, teks, dan pesan commit ditulis dalam **Bahasa Indonesia** — ikuti gaya ini.

## Perintah

```bash
npm run dev      # dev server http://localhost:3000
npm run build    # build produksi (juga menjalankan ESLint; error = gagal)
npm test         # unit test (Vitest) — lib/domain & lib/game
npm run e2e      # end-to-end (Playwright)
npm run lint     # ESLint
node tools/<nama>.mjs   # skrip verifikasi e2e di PRODUKSI (puppeteer)
```

Sebelum commit: pastikan `npx tsc --noEmit` bersih dan `npm run build` sukses.
CI (`.github/workflows/ci.yml`) menjalankan `tsc --noEmit` → `npm test` (vitest) → `npm run build` di tiap PR & push ke `master` — jaga ketiganya tetap hijau.

## Variabel lingkungan (`.env.local`, gitignored)

- `NEXT_PUBLIC_SUPABASE_URL` — URL proyek Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — kunci **publishable** (aman di browser; keamanan dijaga RLS)

Jangan pakai *secret key*. `NEXT_PUBLIC_*` harus ada **sebelum build** (juga di env Vercel).

## Arsitektur & pola (WAJIB diikuti)

- **Baca data** → fungsi di `src/lib/data/*.ts` dipanggil dari **Server Component**.
- **Tulis data** → **Server Action** (`'use server'`) di `src/lib/data/*-actions.ts`, dipanggil dari Client Component.
- **Client Component** (`'use client'`) hanya untuk interaktif (form, tombol, game, carousel).
- **Keamanan = RLS per tabel** + guard kode: `getAnakTerjamin` (login + kepemilikan anak; **sengaja TANPA gerbang langganan** — lihat aturan redirect di bawah), `getAdminTerjamin`, `getGuruTerjamin`, `adminDb()`/`db()`. Query "milik sendiri" **selalu** difilter `.eq('id'|'ortu_id', user.id)` (jangan `.single()` tanpa filter — admin bisa baca banyak baris → error).
- **Peran:** `profiles.is_admin` & `is_guru` + fungsi SQL `is_admin()`/`is_guru()`. Trigger `cegah_self_admin` mencegah user mempromosikan diri (hanya admin/SQL yang boleh ubah role). Peran hanya diberikan lewat SQL Editor atau halaman admin (Kelola Guru).
- **Uang/total dihitung ulang di server** (anti manipulasi); harga di-*snapshot* saat checkout/pendaftaran (`item_pesanan`, `pendaftaran_event.total`). Stok berkurang saat admin verifikasi.
- `params`/`searchParams` = Promise (harus `await`). Setelah menulis, panggil `revalidatePath('/...')`.
- **Form + Server Action — field harus ikut ter-reset.** React 19 mereset `<form action={serverAction}>` otomatis setelah action selesai, **tapi hanya field UNCONTROLLED**. Komponen client yang menyimpan nilai di `useState` tetap terisi setelah simpan — pernah menyebabkan bug nyata: nominal tak ter-reset DAN **URL foto nota transaksi sebelumnya ikut ter-submit** pada entri berikutnya. Aturan: nilai yang ter-submit dibuat **uncontrolled** (`defaultValue`, set lewat `ref` bila perlu); state khusus tampilan dibersihkan lewat **`usePadaResetForm`** (`lib/form-reset.ts`). Contoh: `InputRupiah`, `UploadNota`, `BudgetKategoriSelect`.
- **Kartu berbagi (canvas, tanpa dependency):** `lib/kartu-bersama.ts` (palet, pembungkus teks, pemuat aset, ornamen, tipe `IsiKartu`) dipakai oleh `lib/story-card.ts` (**1080x1920**, IG Story) dan `lib/feed-card.ts` (**1080x1080**, IG Feed). Isinya berasal dari SATU sumber - `ShareButton.isiKartu()` - jadi kedua kartu mustahil berbeda isi.
  - **Aturan "tidak boleh terpotong"** (keduanya dari keluhan nyata): teks memakai **`ukuranPas()`** yang mengecilkan font sampai benar-benar muat (cek jumlah baris **dan** lebar tiap baris) - jangan memotong dengan elipsis; foto memakai **`gambarMuat()` (`contain`)** di kartu Feed, karena sampul artikel sering memuat TULISAN sehingga `cover` memenggal kata.
  - **Perubahan tata letak WAJIB diperiksa visual** - output canvas tidak bisa dinilai dari membaca kode. Render lewat UI sungguhan dengan Playwright: buka `/artikel/<slug>`, klik Bagikan, pilih item menu, tangkap event `download`. Uji minimal dua kasus ekstrem: **artikel berjudul terpanjang** dan **artikel tanpa sampul**.
- **`redirect()` WAJIB membawa alasan yang terbaca pengguna.** Pantulan diam ke halaman asal **tidak bisa dibedakan dari tombol rusak**. Bug nyata: `getAnakTerjamin` dulu me-redirect ke `/pilih-anak` begitu langganan ortu kadaluarsa — mengetuk kartu anak seolah tak berfungsi. Selain itu gerbang itu menyalakan diri karena sebab yang bukan kedaluwarsa (baris `langganan` hilang/ganda → `.single()` gagal → status dipaksa `kadaluarsa`). Aturan sekarang: batasi akses lewat **kunci per konten** (`dibatasiTrial` → `boleh_trial` → 🔒 `Terkunci`), bukan pantulan; bila memang harus memantulkan, bawa alasannya di query string dan **tampilkan** di halaman tujuan (`/pilih-anak?galat=…`).
- **Pencarian pada daftar yang dipaginasi harus SERVER-side.** Menyaring di klien hanya mencari di halaman yang sedang terbuka, dan itu terbaca sebagai "datanya tidak ada". Bila kata kunci ikut ke filter PostgREST `or=(...)`, **bersihkan dulu** `% _ , ( ) " * \` — koma & kurung memecah bentuk klausa, `%`/`_` adalah wildcard ILIKE. Syarat pada tabel induk tak bisa di-OR-kan dengan syarat pada tabel anak dalam satu query: kumpulkan id dari tabel anak lebih dulu, lalu gabungkan sebagai `id.in.(…)` (contoh: `/admin/langganan`).
- **Penamaan tampilan ≠ kunci.** Label menu "Kelas Bermain" sudah diganti jadi **"Ide Bermain"**, TAPI hanya labelnya. `key: 'kelas-bermain'` di `MENU_ADMIN`, rute `/admin/kelas-bermain` · `/kelas-saya` · `/kelas/[id]`, dan tabel `kelas_bermain` **tetap** — key itu tersimpan di konfigurasi Akses Menu di database, menggantinya mencabut hak akses semua role. "Event Kelas Bermain" adalah fitur BERBEDA dan tidak ikut diganti; judul SEO/landing juga tidak.
- **Hak akses langganan = DATA, bukan cabang `if`.** Paket ada di tabel `paket_langganan` (0089) dan **status langganan menempel pada ANAK** (`langganan_anak`), bukan akun — satu akun boleh punya anak Preschool dan anak Basic. Semua keputusan akses lewat **`lib/domain/entitlement.ts`** (`hakAksesAnak` / `hakAksesAkun`), jangan menambah cabang `status === 'aktif'` baru. Fitur yang tak punya konteks anak (diskon event/produk, Komunitas, detail materi) memakai **paket TERTINGGI** di akun (`urutan` terbesar) dan aturan itu **wajib ditulis di UI**. Fasilitas berbayar (mis. worksheet) default-nya **terkunci**: prop seperti `bolehWorksheet` berbawaan `false` supaya lupa memasang penjaga tidak berarti bocor.
- **Batas hari langganan: satu aturan, WIB, dan hari terakhir IKUT.** `aktif_sampai` adalah tanggal (`date`), bukan momen — jangan bandingkan `new Date()` dengan `aktif_sampai + 'T00:00:00Z'`: sejak jam 07:00 WIB hari itu sudah "lewat", jadi hari yang sudah dibayar hilang. Bandingkan **string tanggal WIB** (`tanggalWIB(sekarang) <= aktif_sampai`) di TypeScript dan `public.hari_ini_wib()` (0094) di SQL — `current_date` di Supabase adalah tanggal **UTC**, yang antara 00:00–07:00 WIB masih kemarin. Dua sisi yang memakai batas berbeda pernah menghasilkan bug nyata: halaman menyebut langganan anak sudah berhenti, sementara RPC booking masih menganggapnya member dan memberi konsultasi gratis.
- **Mencabut hak ≠ mengakhiri periode hari ini.** `hentikanPaketAnak` dulu menyetel `aktif_sampai = hari ini` dan membiarkan `paket_id`; hasilnya anak itu tetap aktif seharian lalu masih dapat **3 hari tenggang berhak penuh** — tombol "Hentikan" terbaca rusak. Penghentian sekarang mengakhiri periode **kemarin (WIB)** DAN **mengosongkan `paket_id`**, karena masa tenggang adalah kemurahan untuk yang lupa memperpanjang, bukan untuk yang dihentikan. Aturan umumnya: kalau sebuah aksi seharusnya mencabut akses, ujilah lewat **matriks hak akses** (`domain/entitlement.ts`), bukan dengan melihat tanggalnya berubah.
- **Server action yang melaporkan sukses harus tahu ada yang berubah.** `.update().eq(...)` yang tak mencocokkan satu baris pun **bukan error** di PostgREST — ia mengembalikan 0 baris dan aksi lama tetap menjawab `{ ok: true }`. Tambahkan `.select('<kolom kunci>')` lalu periksa panjangnya, dan kembalikan pesan yang menyebut apa yang tak ditemukan.
- **Styling:** kelas global `kp-*` (tombol jelly, kartu, chip) di `globals.css` + CSS Modules `*.module.css`. Palet pastel lavender/mint/peach, tinta `#5b5170`. Maskot `Pewi`, logo `public/logo.png` (komponen `Logo`).

## Database & migrasi

- Migrasi SQL di `supabase/migrations/0001..0094`, **dijalankan MANUAL berurutan** di **Supabase SQL Editor** (tidak ada CLI migrate). Saat menambah skema: buat file `00NN_*.sql` baru, lalu minta user menjalankannya.
- **WAJIB — kolom baru harus TOLERAN sampai migrasinya dijalankan.** Karena kode ter-deploy lebih dulu daripada migrasi manual, JANGAN memasukkan kolom baru ke `select`/`insert` di alur kritis (daftar/katalog, pendaftaran, simpan data). Query akan gagal `42703` dan mematikan fitur yang tadinya jalan. Pola yang benar (contoh: `lib/data/kuota-event.ts`): baca kolom baru lewat **query terpisah** yang mengembalikan nilai default bila gagal, dan pada write **retry tanpa kolom baru** bila error kolom-hilang. Fitur baru menyala otomatis setelah migrasi dijalankan.
- Tabel utama: `profiles`, `anak`, `langganan`, `tema`, `paket_aset` (`butir` jsonb = isi game), `hasil_main`, `video`, `kelas_bermain` (`bahan`/`aktivitas` jsonb), `favorit`, `riwayat_kelas`, `event`, `pendaftaran_event`, `produk`, `keranjang_item`, `pesanan`, `item_pesanan`, `catatan_perkembangan`, `jadwal_psikolog` (jadwal & durasi, diisi psikolog), `psikolog_profil` (master profil, diisi admin).
- **Storage** bucket `aset` (publik baca): tulis admin (folder `produk/`, `event/`, `worksheet/`), user hanya folder `bukti/` (bukti bayar).

## Konvensi menambah fitur

1. Data: tambah reader di `lib/data/<fitur>.ts` + action di `<fitur>-actions.ts` (`'use server'`).
2. Tipe di `src/lib/game/tipe.ts`; util format di `src/lib/format.ts`.
3. Halaman di `src/app/<rute>/page.tsx` (Server) + komponen Client bila perlu; admin di `src/app/admin/<fitur>/` + tambah link di `src/app/admin/page.tsx`.
4. Skema baru → migrasi `00NN_*.sql` + RLS (baca milik sendiri/admin/guru sesuai kebutuhan).
   - **Mesin game baru** WAJIB migrasi perluas CHECK `paket_aset_mesin_check` (pola `0025..0037`, `0074`) — tanpa itu INSERT paket ditolak DB (error ter-redact di production).
5. Verifikasi: `tsc --noEmit` + `npm run build`; untuk fitur besar buat skrip `tools/<fitur>_check.mjs` (puppeteer) yang uji e2e di produksi lalu **bersihkan data uji**.
6. Commit (Indonesian) + push → Vercel auto-deploy. Ingatkan user menjalankan migrasi bila ada.

## Environment: produksi vs beta (RENCANA, belum aktif)

Rancangan disetujui owner, **kode belum dikerjakan** — detail lengkap + daftar prasyarat di `docs/DEVELOPER-KIDZPLAYFUL.md` §10 "🌱 Environment: Produksi vs Beta".

| | Produksi | Beta |
|---|---|---|
| URL | `www.kidzplayful.com` | `beta.kidzplayful.com` |
| Branch | `master` | `beta` (permanen) |
| Scope env Vercel | Production | Preview |
| Supabase | proyek saat ini | **proyek kedua, terpisah** |

- Alur: `feature/*` → `beta` (uji) → `master` (live).
- **Migrasi dijalankan di beta DULU**, diverifikasi, baru di produksi (manual di kedua sisi).
- Belum siap: base URL masih hardcode produksi di 9 titik, `robots.ts` `allow:'/'` tanpa syarat (beta bisa ter-index), `tools/*_check.mjs` masih menulis ke DB produksi.

## Catatan lingkungan

- Shell user = **PowerShell**: `&&` TIDAK berlaku — pakai `;` atau baris terpisah.
- **Git Bash mengonversi argumen berawalan `/`** menjadi path Windows (`/artikel/x` menjadi `C:/Program Files/Git/artikel/x`). Saat mengoper path URL ke skrip Node, awali perintah dengan `MSYS_NO_PATHCONV=1`.
- **Dev server yatim**: `next dev` bisa tertinggal memegang port 3000 setelah proses induknya mati. Instance baru menolak start (*"Another next dev server is already running"*) dan halaman balas **500** dari proses lama yang rusak — mudah disalahartikan sebagai bug kode. Matikan PID yang disebut di pesan Next.js (`taskkill //PID <pid> //F`), lalu jalankan ulang. Jangan menjalankan `npm run dev` bersamaan dengan `npm run build` — keduanya menulis ke `.next`.
- Commit tanpa gpg sign bila perlu: `git -c commit.gpgsign=false commit ...`.
- Deploy Vercel **Hobby** butuh repo **public**. **Kegagalannya SENYAP**: kalau repo diprivatkan, deploy diblokir tapi `git push` tetap sukses dan CI tetap hijau — fitur baru sekadar tidak pernah muncul (pernah 5 hari, Agustus 2026). Setelah repo dipublikkan lagi, Vercel **tidak** otomatis membangun commit yang masuk saat privat → picu dengan `git commit --allow-empty` atau Redeploy. Diagnosis: `docs/RUNBOOK-OPERASIONAL.md` **RB-10**. Reset password butuh **SMTP** + **Redirect URL** `/reset-sandi` diatur di Supabase Auth.
- Akun admin uji: `admin@kidzplayful.app`. Peran guru diaktifkan via Admin → Kelola Guru (guru daftar dulu).

## Dokumentasi

- `docs/DOKUMENTASI-KIDZPLAYFUL.md` (+PDF) — dokumentasi teknis menyeluruh (arsitektur, skema, deploy).
- `docs/INFRASTRUKTUR-KIDZPLAYFUL.md` (+PDF) — **rencana infrastruktur & skala**: model kapasitas 4 tier (T0→T3) dengan pemicu terukur, index/RLS/RPC agregasi, observability & alert, backup/DR, egress & biaya. Semua SQL/kode di sana berstatus **lampiran siap tempel — belum diterapkan ke repo**.
- `docs/RUNBOOK-OPERASIONAL.md` (+PDF) — prosedur saat kejadian (RB-01…RB-09): backup, uji restore, DR, insiden down, rilis+migrasi, rollback, rotasi kredensial.
- `docs/specs/` — spec desain. `docs/superpowers/plans/` — rencana per milestone (M1–M17).
- `MEMORY.md` — peta modul & alur (dari `/graphify`).
