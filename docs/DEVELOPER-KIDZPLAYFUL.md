# Dokumentasi Developer — KidzPlayful

> 🗺️ **Mencari letak sebuah fungsi atau alur?** Dokumen ini menjelaskan **kenapa** tiap keputusan diambil. Untuk peta **di mana** kode-nya berada — daftar modul & fungsi per lapisan, alur ujung-ke-ujung, dan indeks "gejala → berkas" — buka [`REFERENSI-KODE-KIDZPLAYFUL.md`](REFERENSI-KODE-KIDZPLAYFUL.md).

> Panduan teknis untuk developer baru. Menjelaskan **per halaman/menu**: file apa yang menanganinya, function/reader/server-action apa yang dipakai, dan **endpoint backend** (tabel Supabase / RPC / storage / auth) yang disentuh. Termasuk **REST API internal** (untuk aplikasi mobile) dan infrastruktur.

Terakhir diperbarui: 2026-08-19.

**Dokumen pendamping:** [`INFRASTRUKTUR-KIDZPLAYFUL.md`](INFRASTRUKTUR-KIDZPLAYFUL.md) — rencana penataan & skala infrastruktur (model kapasitas 4 tier, index/RLS/agregasi, observability, backup & DR, egress & biaya) · [`RUNBOOK-OPERASIONAL.md`](RUNBOOK-OPERASIONAL.md) — prosedur saat kejadian (backup, uji restore, DR, insiden, rilis+migrasi, rotasi kredensial).

---

## 1. Ringkasan & Stack

- **Framework**: Next.js 16 (App Router, Server Components + Server Actions).
- **Bahasa**: TypeScript. Semua kode/komentar/UI berbahasa Indonesia.
- **Backend**: Supabase (Postgres + Row Level Security + Auth + Storage).
- **Hosting**: Vercel (`www.kidzplayful.com`).
- **Gerbang mutu**: `npx tsc --noEmit` + `npm test` (vitest) + `npm run build` — juga dijalankan otomatis oleh **CI GitHub Actions** (`.github/workflows/ci.yml`) di tiap PR & push ke `master`.
- **Akses backend via anon key + RLS**. Operasi admin diamankan guard aplikasi + RLS + fungsi SQL `is_admin()`/`is_guru()`/`is_investor()`/`is_superuser()`. Bypass RLS: RPC `laporan_engagement()` (SECURITY DEFINER, ber-guard `is_admin()`) + **service-role key opsional** (`SUPABASE_SERVICE_ROLE_KEY`, server-only) hanya untuk **buat user** (`lib/supabase/admin.ts`).

### Cara membaca dokumen ini
Tiap halaman ditulis dalam blok:
- **File** — page + komponen client + komponen bersama.
- **Fungsi data (reader)** — fungsi baca dari `src/lib/data/*.ts`.
- **Server action** — fungsi `'use server'` (tulis data).
- **Endpoint backend** — tabel/RPC/storage/auth yang benar-benar disentuh.
- **Guard/Role** — proteksi akses.

---

## 2. Struktur folder

```
src/
  app/                 # rute (App Router)
    (legal)/           # halaman legal (route group)
    admin/             # panel admin (+ keuangan/)
    api/               # REST API internal (Route Handlers, untuk mobile)
    <publik & ortu>/   # landing, store, event, komunitas, main, dst.
  components/          # komponen UI bersama (client)
  lib/
    data/              # reader (baca) + *-actions.ts (server actions)
    domain/            # logika murni & teruji (trial, gamifikasi, harga, laporan, usia, stiker…)
    supabase/          # server.ts (SSR), client.ts (browser)
    api/               # helpers.ts (amplop JSON + auth Bearer untuk REST API)
    game/              # tipe & util mesin game
supabase/migrations/   # skema DB (0001..0088), dijalankan manual di SQL Editor
docs/                  # dokumentasi (termasuk file ini)
tools/md2pdf.py        # generator PDF dokumentasi
```

---

## 3. Konvensi penting

### Autentikasi & role
- Role = kolom boolean di tabel `profiles`: `is_superuser`, `is_admin`, `is_guru`, `is_investor`.
- Fungsi SQL (`security definer`) untuk RLS: `is_admin()`, `is_guru()`, `is_investor()`, `is_superuser()`.
- **Trigger `cegah_self_admin`** (migrasi 0056): mencegah eskalasi mandiri — `is_admin`/`is_superuser` hanya bisa diubah super user; `is_guru`/`is_investor` hanya oleh admin/super user; user biasa tak bisa mengubah role apa pun pada dirinya.

### Pola guard (lapis ganda)
- **Halaman admin**: `admin/layout.tsx` memakai **`getAksesAdmin()`** (`lib/data/admin.ts`) → hitung menu yang boleh per role (matriks Akses Menu, lihat §4 Akses Menu); redirect `/pilih-anak` bila tak punya akses menu apa pun. Super user = semua. `getAdminTerjamin()` (is_admin/superuser) masih dipakai halaman non-menu (mis. stiker). `/admin/akses-menu` pakai `getSuperuserTerjamin()`. Halaman anak: `getAnakTerjamin()` (login + kepemilikan; **tanpa** gerbang langganan). Investor: `getInvestorTerjamin()`.
- **Routing login**: setelah login → **admin/superuser ke `/admin`**, guru ke `/guru`, lainnya `/pilih-anak` (`login/page.tsx`); admin/superuser yang mendarat di `/pilih-anak` di-redirect ke `/admin`.
- **Enforcement rute**: `src/proxy.ts` (middleware) memblokir user membuka `/admin/<menu>` yang tak diizinkan role-nya → redirect `/admin`.
- **Server action**: setiap file `*-actions.ts` mengulang cek admin sendiri lewat helper lokal (`adminDb()` / `db()` / `pengelola()`) → `auth.getUser()` + baca `profiles.is_admin`.

### Form + Server Action: aturan reset (WAJIB)
- React 19 **mereset `<form action={serverAction}>` secara otomatis** setelah action selesai (selama action tidak `redirect()`) — **tapi hanya field UNCONTROLLED.** Komponen client yang menyimpan nilainya di `useState` (input bermask, pemilih berkas, dropdown ber-info) **tidak** ikut bersih; nilainya tertinggal untuk entri berikutnya.
- **Aturan:** nilai yang **ikut ter-submit** harus **uncontrolled** (`defaultValue`, dan bila perlu di-set lewat `ref`), supaya dibersihkan React sendiri. State yang hanya untuk **tampilan** dibersihkan sendiri lewat **`usePadaResetForm(ref, fn)`** (`lib/form-reset.ts`) yang menyimak event `reset` pada `<form>` induk.
- **Preseden (bug nyata, sudah diperbaiki):** `InputRupiah`, `UploadNota`, dan `BudgetKategoriSelect` dulu controlled → setelah menyimpan pengeluaran, nominal tetap terisi, dan **URL nota transaksi sebelumnya tetap ter-submit** pada entri berikutnya bila admin tidak menyentuh tombol unggah (lampiran salah, bukan cuma kosmetik). Karena ketiganya komponen bersama, satu perbaikan menyembuhkan **5 form**: Pengeluaran, Anggaran, Aset, Sponsor, dan Detail Sponsor.
  - `InputRupiah`: `defaultValue` + mask diterapkan ke **nilai DOM** di `onChange`; posisi kursor dijaga dari **ujung kanan** agar menyunting di tengah angka tidak melompatkan kursor ke akhir.
  - `UploadNota`: `<input type="hidden">` uncontrolled, di-set lewat `ref` saat unggah sukses; thumbnail dibersihkan lewat `usePadaResetForm`.
  - `BudgetKategoriSelect`: `<select>` uncontrolled; panel sisa anggaran disinkronkan kembali ke pilihan awal saat reset.
- **Tidak berlaku untuk** komponen yang menyimpan langsung lewat server action tanpa field tersembunyi di form (mis. `UploadDok` di detail sponsor, yang menulis per `dealId`).

### Redirect harus membawa alasan (WAJIB)
- **Jangan pernah `redirect()` diam-diam ke halaman asal.** Bagi pengguna, pantulan tanpa pesan **tidak bisa dibedakan dari tombol rusak** — itulah bentuk nyata bug "klik profil anak tidak membuka halaman anak" (§8, `/main`).
- Bila akses memang harus dibatasi, batasi lewat **kunci per konten** (`dibatasiTrial` → `boleh_trial` → 🔒 `<Terkunci>`), bukan pantulan — user tetap melihat halamannya dan tahu apa yang terkunci serta kenapa.
- Bila memang harus memantulkan (mis. sumber daya bukan milik user), **bawa alasannya di query string** dan **tampilkan** di halaman tujuan: `redirect('/pilih-anak?galat=anak-tidak-ditemukan')` + spanduk di `/pilih-anak`.
- Waspadai guard yang menyala karena sebab yang keliru: `.single()` pada baris yang **hilang atau ganda** akan error, dan bila hasilnya dipetakan ke "tidak berhak", user terkunci tanpa sebab. Pakai `maybeSingle()` dan bedakan "tidak ada" dari "tidak berhak".

### Pencarian pada daftar terpaginasi (WAJIB server-side)
- Daftar admin yang dipaginasi (mis. `/admin/langganan` 30/halaman) **tidak boleh** disaring di klien: hasilnya hanya mencari di halaman yang sedang terbuka, dan itu terbaca sebagai "datanya tidak ada". Kirim kata kunci sebagai `?q=` lewat `<form method="get">` biasa (bukan komponen klien) — `hal` otomatis terbuang sehingga hasil mulai dari halaman 1.
- **Sanitasi kata kunci** sebelum masuk filter PostgREST `or=(...)`: buang `% _ , ( ) " * \`. Koma & kurung **memecah bentuk klausa** (bukan sekadar membuat hasil salah); `%`/`_` adalah wildcard ILIKE.
- Syarat pada tabel induk **tak bisa** di-OR-kan dengan syarat pada tabel anak dalam satu query PostgREST (`anak.nama=ilike.*q*` + `!inner` bersifat AND). Kumpulkan id dari tabel anak lebih dulu, lalu gabungkan sebagai `id.in.(…)` — dengan **batas eksplisit** dan pemberitahuan di UI bila batas itu tersentuh (jangan memotong diam-diam).

### Data layer
- **Reader** (baca) ada di `lib/data/<fitur>.ts`, memakai `createClient()` dari `@/lib/supabase/server`.
- **Server action** (tulis) ada di `lib/data/<fitur>-actions.ts` dengan `'use server'` + guard.
- Halaman tidak menaruh selector mentah bila bisa lewat reader; beberapa halaman melakukan query inline sederhana.

### Deploy & migrasi
- Migrasi dijalankan **manual** di Supabase SQL Editor (urut `0001..0088`), lalu diverifikasi via REST (`?select=col&limit=1` → 200).
- Commit: `git -c commit.gpgsign=false commit` + baris `Co-Authored-By`. Push ke `master` → Vercel auto-deploy.
- Banyak reader dibungkus `try/catch` agar fitur aman dideploy sebelum migrasinya dijalankan (mengembalikan nilai default).

### Storage
- **Satu bucket: `aset`**. Upload dilakukan **client-side** (komponen client), lalu URL publik disimpan lewat server action. Folder: `event/`, `produk/`, `worksheet/`, `artikel/`, `nota/`, `bukti/`, dan aset game.

### Environment
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — wajib (URL + anon key).
- **`SUPABASE_SERVICE_ROLE_KEY`** — opsional, **server-only** (tanpa `NEXT_PUBLIC_`). Hanya dipakai fitur **buat user** (`lib/supabase/admin.ts`). Boleh legacy `service_role` (JWT) atau new secret key (`sb_secret_…`). Bila kosong, fitur buat user menampilkan error jelas (fitur lain tetap jalan).

---

## 4. Panel Admin — per menu (non-keuangan)

Pembungkus: `admin/layout.tsx` (guard `getAksesAdmin`, kirim `allowed`+`isSuperuser`+`isPsikolog`+`isGuru` ke nav) + `AdminNav.tsx` (navigasi, filter menu sesuai akses; bila akun juga psikolog/guru tampil chip **🧠 Area Psikolog** / **🍎 Area Guru** menuju dashboard kerjanya) + `LogoutBtn.tsx`. Akses menu per role diatur di **🔐 Akses Menu** (super user).

### 🏠 Dashboard (Tema) — `/admin`
- **File**: `admin/page.tsx` (server, form inline).
- **Server action**: `buatTema`, `setMingguIni`, `hapusTema`, **`setBolehTrialTema`** (toggle Trial ✓/✗ per tema) (`admin-konten.ts`).
- **Endpoint**: `tema` (select/insert/update/delete; `boleh_trial`).

### 📈 Analitik — `/admin/analitik`
- **File**: `admin/analitik/page.tsx` (query inline).
- **Fungsi data**: `getAktivitasRingkas()` (`aktivitas.ts`) — fitur populer + user aktif hari ini.
- **Endpoint**: `anak`, `hasil_main`, `pendaftaran_event`, `pesanan`, `postingan`, `komentar`, `profiles`, `aktivitas`.

### 🗓️ Event — `/admin/event`
- **File**: `admin/event/page.tsx` → `EventAdmin.tsx` (+ `PanelSertifikat`).
- **Fungsi data**: `getEventSemua()`, `getJumlahPendaftar()` (`admin-event.ts`).
- **Server action**: `buatEvent`, `updateEvent`, `toggleStatusEvent`, `hapusEvent`, `simpanBerkasSertifikat` (`admin-event-actions.ts`); `generateSertifikatEvent` (`admin-sertifikat-actions.ts`).
- **Kelas terpisah**: form Add/Edit punya bagian **Baby Class** & **Toddler Class** (tgl + jam mulai/selesai per kelas; `EventInput.baby*/toddler*` → kolom `event.baby_*`/`toddler_*`). Kosong = event gabungan (pakai tgl/jam utama).
- **Kuota peserta per kelas (0086)**: kolom `event.kuota_baby` / `kuota_toddler` / `kuota_gabungan` (**null/0 = tanpa batas**), diisi di form Add/Edit (input "Kuota anak" di section Baby & Toddler + "Kuota anak (event gabungan)"). Kuota dihitung dalam **jumlah ANAK**; pendaftaran **`ditolak` tidak dihitung** (kuota kembali saat admin menolak), sedangkan `menunggu` **tetap memakai** kuota agar tak over-booking. Halaman **Pendaftar** menampilkan `sisa N dari kuota X` / `kuota PENUH (n/X)` di header tiap grup kelas.
- **Perhitungan kuota terpakai**: RPC **`kuota_terpakai_event(p_event_id)`** (`security definer`, granted ke `authenticated, anon`) mengembalikan `{kelas, anak}` per kelas — diperlukan karena RLS `pendaftaran_event` hanya mengizinkan ortu membaca barisnya sendiri, sementara sisa kuota butuh agregat semua pendaftar (yang dikembalikan hanya ANGKA, tanpa data pribadi). Reader TS: `getKuotaTerpakai(eventId)` + helper `sisaKuota(kuota, terpakai)` di `lib/data/event.ts`.
- **Penegakan**: `daftarEvent` menolak dengan pesan **"Mohon maaf, kuota sudah penuh. Terima kasih 🙏"** bila sisa 0, atau pesan **tanpa angka** ("kuota yang tersisa tidak cukup untuk jumlah anak yang dipilih") bila anak yang dipilih melebihi sisa.
- **⚠️ Sisa kuota TIDAK ditampilkan ke orang tua** (permintaan pemilik). Di `DaftarForm` yang tampil hanya status **penuh** — badge `❌ Kuota penuh` per opsi kelas, banner merah, dan tombol Daftar dinonaktifkan. Status penuh sengaja **dipertahankan**: tanpa itu orang tua memilih kelas yang sudah penuh, menekan Daftar, lalu baru ditolak. Angka sisa juga dihilangkan dari **pesan server**, karena pesan itu muncul di halaman yang sama. **Panel admin tetap menampilkan `sisa X/Y`** — di sanalah angkanya memang dibutuhkan.
- **⚠️ Kolom kuota diakses TOLERAN — `lib/data/kuota-event.ts`** (pelajaran dari regresi nyata): karena migrasi dijalankan manual, kolom `kuota_*` bisa **belum ada** di DB saat kode sudah ter-deploy. Dulu kolom ini ikut di `select` alur inti → query gagal (`42703`) → daftar event kosong, halaman pendaftaran redirect, user gagal daftar, admin gagal simpan event, dan pindah kelas memunculkan "Event tidak ditemukan". **Aturan sekarang**: kuota TIDAK ikut di `select` alur kritis; dibaca terpisah lewat **`bacaKuotaEvent(s, eventId)`** yang mengembalikan semua `null` (= tanpa batas) bila gagal/kolom belum ada. `buatEvent`/`updateEvent` **retry tanpa field kuota** bila `kolomKuotaHilang(error)`; `getEventSemua`/`getEventAdmin` mencoba dgn kuota → fallback tanpa kuota; `DaftarForm` & halaman Pendaftar menerima kuota via **prop**, bukan dari `ev.kuota_*`. Penegakan kuota menyala otomatis begitu migrasi dijalankan. **Pola ini wajib diikuti untuk kolom baru lain yang dipakai di alur kritis.**
- **Harga tambah pendamping**: `EventInput.hargaPendamping` → `event.harga_pendamping` (per-event; 0 = tanpa opsi pendamping).
- **⬇ Download Peserta**: tombol per card event (`DownloadPesertaBtn.tsx`) → server action `getPesertaEkspor(eventId)` (`admin-event-actions.ts`) → CSV BOM UTF-8, **hanya pendaftaran ber-status `diterima`**, **dikelompokkan per kelas** (Baby/Toddler/Gabungan), kolom: No, Nama Panggilan, Nama Lengkap, Tgl Lahir (Umur), Nama Orang Tua, Pendamping, Waktu Daftar (WIB).
- **Badge 👥 Pendaftar (n)**: `getJumlahPendaftar()` **tidak menghitung** pendaftaran `ditolak`.
- **Endpoint**: `event` (+ kolom `baby_*`/`toddler_*`/`harga_pendamping`), `pendaftaran_event`, `anak`+`profiles` (join ekspor), `sertifikat` (upsert), `storage.from('aset')` (folder `event/`, `event/sertifikat-*`, `event/stiker-*`).

### 🗓️ Pendaftar Event — `/admin/event/[id]/pendaftar`
- **File**: `admin/event/[id]/pendaftar/page.tsx` → `PendaftarAdmin.tsx` + `ParameterPerkembanganForm.tsx` + `NilaiPerkembanganForm.tsx`.
- **Fungsi data**: `getEventAdmin(id)`, `getPendaftaranByEvent(id)`, `getSertifikatMapByEvent(id)`, `getEventSemua()` (`admin-event.ts`); `getPesertaEvent(id)`, `getEventBerParameter(id)` (`guru.ts`, untuk catatan per anak & opsi duplikat).
- **Server action**: `setStatusPendaftaran(id, status, alasan?)` (Tolak **wajib alasan** via prompt → `pendaftaran_event.alasan_tolak` (0075), di-null-kan saat kembali diterima/menunggu), `setKehadiran`, `reschedulePendaftaran`, **`simpanParameterPerkembangan`**, **`duplikatParameterPerkembangan`** (`admin-event-actions.ts`); **`simpanCatatan`** (`guru-actions.ts`, admin boleh isi nilai per anak).
- **Endpoint**: `event` (`indikator_perkembangan`), `pendaftaran_event`, `sertifikat`, `catatan_perkembangan` (`penilaian`); `setStatusPendaftaran` → `catatLedger`/`hapusLedgerRef` ke `transaksi_keuangan`.
- **Catatan Tumbuh Kembang** (lihat §7½): admin tetapkan **Parameter (Area+Indikator) per event** (+ tombol Duplikat dari event lain), lalu beri **Nilai** per anak. Bagian Parameter kini **collapsible** (`<details>`) agar tak memenuhi layar.
- **UI daftar pendaftar**: **filter 🔎 cari nama anak / orang tua** (live); pendaftar **di-group per kelas** (Baby/Toddler/Gabungan — nilai kelas kosong/tak dikenal dipetakan ke Gabungan agar kartu tak tersembunyi) dengan **jumlah peserta** di header grup (**tanpa** yang `ditolak`); tiap kartu menampilkan **umur anak per hari ini** (`umurTeks`/`umurBulanTotal` di `domain/anak.ts`), **👤 nama orang tua** (`ortuMap` dari `profiles.nama_tampilan`, fallback email), jumlah pendamping, **🕐 waktu daftar** (`created_at`, WIB), dan **❌ alasan ditolak** bila ada. Error query `getPendaftaranByEvent` di-`console.error` (Vercel Logs).
- **Grup kelas bisa dilipat (expand/collapse)**: header tiap kelas jadi tombol (▾/▸) berisi label + jumlah peserta + sisa kuota; ada tombol **⊟ Tutup semua / ⊞ Buka semua**. Saat **menyaring** (pencarian atau filter usia), semua grup **dipaksa terbuka** agar hasilnya tetap terlihat walau kelasnya tadi ditutup (header menampilkan badge `N hasil`). Grup yang memang tidak punya pendaftar sama sekali tetap disembunyikan.
- **Filter rentang usia** (satuan **BULAN**): dua input `min`–`maks` + preset cepat `0–12 bln` / `1–2 th` / `2–3 th` / `3–4 th` / `4 th+` (label ramah, nilai tetap bulan) + `✕ semua usia`. Satuan bulan dipilih karena kelas Baby biasanya **6–18 bulan** — rentang itu tidak bisa dinyatakan dalam tahun bulat. Dasar datanya `umurBulanMap` (`anak_id → umur bulan`, dihitung di `page.tsx` via `umurBulanTotal`), berdampingan dengan `umurMap` yang berisi teks tampilan. **Semantik**: sebuah *pendaftaran* lolos bila punya **minimal 1 anak** dalam rentang; anak tanpa `tanggal_lahir` tidak dianggap cocok saat filter aktif (dinyatakan eksplisit di UI). Rentang terbalik (min > maks) → filter diabaikan + peringatan, bukan hasil kosong yang membingungkan.
- **Urutan waktu daftar** (`🕐 Urutkan`): `↓ Terbaru` / `↑ Terlama`, diterapkan **per grup kelas** pada `semua` (bukan pada hasil filter), jadi urutan tetap konsisten saat mencari. Default `Terbaru` = urutan yang memang dikirim server (`getPendaftaranByEvent` sudah `order created_at desc`), sehingga tampilan awal tidak berubah. Pendaftaran **tanpa `created_at`** (data lama) selalu ditaruh paling bawah di **kedua** arah — kalau tidak, "Terlama" justru diawali baris yang tak diketahui waktunya. Aman terhadap aturan hide-not-unmount di bawah: kartu ber-`key={p.id}`, jadi mengurutkan ulang hanya **memindahkan** elemen dan state `NilaiPerkembanganForm` yang belum disimpan tidak hilang.
- **Peserta & sisa kuota SELALU dihitung dari seluruh pendaftaran kelas itu**, bukan dari hasil filter. Sebelumnya `jml`/`sisa` dihitung dari daftar yang sudah difilter, sehingga "sisa kuota" di header **salah setiap kali admin mencari**; filter usia akan memperparahnya. Jumlah hasil filter ditampilkan terpisah sebagai badge `N hasil`.
- **Kartu yang tak lolos filter DISEMBUNYIKAN (`display:none`), bukan di-unmount** — kartu memuat `NilaiPerkembanganForm` ber-state, jadi unmount saat admin mengetik akan membuang penilaian yang belum disimpan. Catatan: **melipat grup tetap meng-unmount** (aksi eksplisit + menghemat render); yang dilindungi adalah pengetikan filter yang bersifat sementara.
- **💬 WA ke orang tua**: tiap kartu punya tombol WA (`linkWa` + `profiles.no_wa` via `waMap`) berisi pesan konfirmasi siap kirim — dipakai untuk memastikan persetujuan ortu sebelum memindahkan kelas.
- **🔀 Pindah kategori kelas** (dalam event yang sama, mis. Baby → Toddler): server action **`pindahKelasPendaftaran(id, kelasBaru)`** — validasi kelas tujuan memang ditawarkan event, **kuota kelas tujuan ditegakkan** (`sisa < jumlah anak` → ditolak), lalu `pendaftaran_event.kelas` + snapshot **`kelas_jadwal` diperbarui** dari jadwal kelas tujuan (util bersama `lib/domain/jadwal.ts` `jadwalTeks`, dipakai juga oleh `daftarEvent`). Dropdown menampilkan sisa kuota per kelas tujuan & menonaktifkan opsi yang tak cukup; ada `confirm()` yang mengingatkan agar konfirmasi ke ortu dulu. Beda dari **🔁 Reschedule** yang memindahkan pendaftaran ke **event lain**.
- **Stiker nama**: pendaftaran `ditolak` **tidak** ikut dicetak (`/stiker-event/[id]`).
- **Lihat bukti/nota = MODAL**: komponen bersama **`components/BuktiLightbox.tsx`** (client leaf, boleh dirender dari Server Component). Props `url`, `label`, `judul`, `variant` (`tombol` | `tautan` | `thumb`). Tutup via ✕ / klik backdrop / **Escape**; PDF → `<iframe>`, gambar → `<img>`; tetap ada "Buka di tab baru ↗". Dipakai di: pendaftar event, `/admin/pesanan`, `/pesanan/[id]` (ortu), detail transaksi keuangan (bukti pesanan/pendaftaran, lampiran nota, nota aset), daftar pengeluaran & aset, serta thumbnail `UploadNota`. Tautan WhatsApp & halaman cetak (sertifikat/stiker) tetap `target="_blank"`.

### 🛍️ Produk — `/admin/produk`
- **File**: `admin/produk/page.tsx` → `ProdukAdmin.tsx`.
- **Fungsi data**: `getProdukSemua()` (`admin-store.ts`).
- **Server action**: `buatProduk`, `updateProduk`, `hapusProduk` (`admin-store-actions.ts`).
- **Endpoint**: `produk`; `storage.from('aset')` (folder `produk/`).

### 🎟️ Voucher — `/admin/voucher`
Master voucher diskon + redeem saat transaksi (event/produk), tercatat net di laporan (migrasi **0084**).
- **File**: `admin/voucher/page.tsx` → `VoucherAdmin.tsx`.
- **Data**: `getVoucherSemua()` + helper `nilaiVoucherByKode/ById(s,...)` (`data/voucher.ts`, cek kuota total & per-user); logika murni `domain/voucher.ts` (`hitungPotongan` nominal/persen, `validasiVoucher` aktif/tanggal/jenis; **teruji vitest**).
- **Server action** (`voucher-actions.ts`, `{ok,error}`): `buatVoucher`/`updateVoucher`/`setAktifVoucher`/`hapusVoucher`; **`cekVoucher(kode, jenis, subtotal)`** dipanggil dari form transaksi (Terapkan).
- **Master**: `kode` (unik, UPPERCASE), `tipe` nominal|persen + `nilai`, `berlaku_event`/`berlaku_produk` (jenis transaksi), `kuota_total` & `kuota_per_user` (null=∞), `berlaku_dari`/`berlaku_sampai`, `aktif`.
- **Redeem**: `daftarEvent(..., voucherId)` & `checkout({..., voucherId})` → re-validasi server, `potongan` mengurangi `total`/`subtotal`, simpan `voucher_id`+`potongan_voucher` di `pendaftaran_event`/`pesanan`, insert `voucher_redeem` (`ref_tipe`,`ref_id` unik → **1 voucher/transaksi**). Kuota **dilepas** (hapus `voucher_redeem`) saat pendaftaran **ditolak** / pesanan **dibatalkan**.
- **Laporan**: ledger memakai nilai NET (event `total`; store `subtotal - potongan_voucher` di `verifikasiPesanan`) → pendapatan mencerminkan potongan; `getTransaksiDetail` menampilkan "🎟️ Voucher <kode> −Rp X". Diskon langganan diterapkan dulu, voucher menumpuk di atasnya.
- **Endpoint**: `voucher`, `voucher_redeem`, `pendaftaran_event`(+`voucher_id`/`potongan_voucher`), `pesanan`(+idem), `transaksi_keuangan`.

### 📦 Pesanan — `/admin/pesanan`
- **File**: `admin/pesanan/page.tsx` (+ `Pager.tsx`) → `PesananAdmin.tsx`.
- **Fungsi data**: `getPesananSemua(hal)` (`admin-store.ts`, 20/hal + item).
- **Server action**: `setOngkir`, `verifikasiPesanan`, `setResi`, `ubahStatusPesanan` (`admin-store-actions.ts`).
- **Endpoint**: `pesanan`, `item_pesanan`, `produk` (kurangi stok saat verifikasi); `verifikasiPesanan` → `catatLedger` (kategori `store`, jumlah=subtotal); `batal` → `hapusLedgerRef`.

### 🎈 Ide Bermain — `/admin/kelas-bermain`
> **Penamaan**: fitur ini **berganti nama tampilan** dari "Kelas Bermain" menjadi **"Ide Bermain"** (permintaan pemilik). Yang berubah **hanya label yang dilihat manusia**: menu admin (`MENU_ADMIN`), judul & teks halaman admin, label nav bawah orang tua (`Kelas` → `Ide`), judul `/kelas-saya` & `/favorit`, layar terkunci (`Materi Ide Bermain`), serta label analitik di `aktivitas.ts` & `atribusi.ts`.
> **Sengaja TIDAK diubah**, karena mengubahnya merusak sesuatu:
> - `key: 'kelas-bermain'` di `MENU_ADMIN` dan `href`/rute `/admin/kelas-bermain`, `/kelas-saya`, `/kelas/[id]`, `/api/kelas-bermain` — key tersimpan di konfigurasi **Akses Menu** di database; menggantinya mencabut hak akses semua role. Nama tabel `kelas_bermain` juga tetap.
> - **"Event Kelas Bermain"** (`/event`, `EventAdmin`, `RekomendasiItemPicker`) — itu fitur **berbeda** (kelas tatap muka berbayar), bukan materi ide bermain.
> - **Judul SEO/landing** (`layout.tsx`, `page.tsx` metadata, `opengraph-image.tsx`, metadata `/coba/kelas/[id]`) — mengubah `<title>` yang sudah terindeks berisiko ke SEO; ganti hanya bila memang diputuskan sebagai perubahan brand.

- **File**: `admin/kelas-bermain/page.tsx` → `KelasAdmin.tsx`.
- **Fungsi data**: `getKelasSemua()` (`kelas-bermain.ts`), `getProdukSemua()` (`admin-store.ts`), `getFokusAreaAktif()` (`fokus-area.ts` → chips form).
- **Server action**: `buatKelas`, `updateKelas`, `toggleStatusKelas`, `hapusKelas`, **`setBolehTrialKelas`** (toggle Trial ✓/✗) (`kelas-bermain-actions.ts`).
- **Field per kelas** (kolom tabel, 0076–0077): **🎯 `tujuan`**, **👶 `usia_min`/`usia_max`**, **🧩 `fokus_area` text[]** (chips multi-pilih; daftar area dari **master `fokus_area`**, lihat di bawah), **🤝 `peran_ortu`**. Tampil di detail user `/kelas/[id]` sebagai kartu info (label badge juga dari master, fallback bawaan).
- **🖼️ `sampul_url` (cover, 0083)**: upload gambar cover di form admin (kompres 1280/0.82 → `aset/kelas/`). Dipakai di: **banner atas detail** (`KelasIsi`), **kartu Share IG Story** (prop `gambar` ShareButton), dan **teaser** `/coba/kelas/[id]` (gambar + OG image). Opsional — tanpa cover memakai kartu brand/OG default.
- **Field per AKTIVITAS** (key bernama di jsonb `aktivitas` — keputusan owner: tetap jsonb, 1 kelas = N aktivitas): `judul`, `cara_membuat`, `langkah[]`, **`catatan_ortu`**. Tampilan user memakai subjudul **🛠️ CARA MEMBUAT**, **🎲 CARA BERMAIN** (langkah), **💡 CATATAN UNTUK ORANG TUA** (kartu kuning); teks Tujuan/Peran/Catatan `pre-wrap` (baris & penomoran admin dipertahankan).
- **Tampilan user KONSISTEN**: komponen bersama **`components/KelasIsi.tsx`** merender isi materi (kartu info + bahan + aktivitas ber-subjudul + media) → dipakai di **detail `/kelas/[id]`**, **Mode Anak** (`MenuAnak`), **Mode Ortu** (`/ortu/[anakId]`) supaya identik dgn admin. Label fokus area via `getLabelFokusArea()` (fallback bawaan). Card daftar admin kini ringkas: judul + range usia (+ badge status/trial).
- **Endpoint**: `kelas_bermain` (+`boleh_trial`/`tujuan`/`fokus_area`/`peran_ortu`/`usia_*`), `produk`, `fokus_area`; `storage.from('aset')` (folder `worksheet/`).

### 🧩 Master Fokus Area — `/admin/fokus-area`
Master data pilihan chips Fokus Area Perkembangan (dipakai form Kelas Bermain & label di sisi user).
- **File**: `admin/fokus-area/page.tsx` → `FokusAreaAdmin.tsx`.
- **Fungsi data**: `getFokusAreaSemua()`, `getFokusAreaAktif()`, `getLabelFokusArea()` (peta key→label) (`fokus-area.ts`).
- **Server action** (`fokus-area-actions.ts`, return `{ok,error}`): `buatFokusArea(label, urutan)` — **key di-slug dari label tanpa emoji** dan **tak berubah saat label diedit** (data kelas lama tetap cocok); `updateFokusArea(id, {label,urutan,aktif})`; `hapusFokusArea(id)` (saran: **nonaktifkan** bila masih dipakai — hapus membuat kelas lama menampilkan key mentah).
- **Endpoint**: tabel `fokus_area` (0078: key unik, label, urutan, aktif; RLS baca authenticated, kelola admin; seed 8 area bawaan).
- Area **nonaktif** hilang dari chips form tanpa menyentuh data kelas lama.

### 📝 Artikel — `/admin/artikel` & `/admin/artikel/[id]`
- **File**: `admin/artikel/page.tsx` (daftar) + `admin/artikel/[id]/page.tsx` → `ArtikelForm.tsx`.
- **Fungsi data**: `getArtikelSemua()`, `getArtikelById(id)` (`artikel.ts`).
- **Server action**: `buatArtikel`, `simpanArtikel`, `hapusArtikel` (`artikel-admin.ts`).
- **Endpoint**: `artikel`; `storage.from('aset')` (folder `artikel/`). Util `@/lib/slug`.

### 🔗 Bagikan Konten ke Sosial Media
Fitur share dari halaman detail agar orang non-login jadi aware & mendaftar.
- **Komponen `components/ShareButton.tsx`** (client): pakai `navigator.share` (share sheet HP) + fallback popover WhatsApp/Facebook/X/Telegram/Salin link (toast). URL relatif diselesaikan ke absolut via `location.origin`. Util murni `lib/share.ts` (`tautanShare(target,{url,text})`, teruji vitest).
- **Halaman teaser PUBLIK** (tanpa login, punya OG/twitter metadata): **`/coba/kelas/[id]`** & **`/coba/tema/[id]`** (`app/coba/…`) → komponen bersama `components/TeaserPublik.tsx` (brand + gambar + judul + deskripsi ringkas + CTA "Coba Gratis" → `/daftar`). Reader anon `getKelasPublik(id)`/`getTemaPublik(id)` (`publik.ts`) — **hanya metadata ringan** (judul/tujuan/usia/daftar nama game), butir/materi penuh TIDAK ditampilkan (konten berbayar aman). `id` tak valid → `notFound()`.
- **Penempatan tombol**: artikel `/artikel/[slug]` (share URL sendiri); kelas `/kelas/[id]` via `KelasIsi` prop `bagikanUrl` → `/coba/kelas/[id]`; tema di `MenuAnak` layar 'daftar' → `/coba/tema/[id]`.
- **Endpoint**: `kelas_bermain`, `tema`, `paket_aset` (baca anon — `tema`/`paket_aset` via migrasi **0081**; `kelas_bermain` sudah anon sejak 0022).
- **Atribusi share (UTM)**: `ShareButton` menyisipkan UTM via `lib/share.ts` `denganUtm(url,{medium,jenis})` (`jenis`= artikel/kelas/game). Komponen **`TangkapRef`** (di teaser & artikel) menangkap first-touch `?utm_source=share&utm_medium&utm_content` → `localStorage kp_ref` (30 hari; util `lib/ref.ts` `parseRef`/`bacaRef`/`hapusRef`, native share → saluran `native`). Saat `/daftar`, ref disimpan ke **`profiles.ref_sumber/ref_saluran/ref_jenis`** (migrasi **0082**). Dashboard: kartu **"🔗 Atribusi Share"** di `/admin/analitik` (`lib/data/atribusi.ts` `getAtribusiShare` — pendaftar 30 hari, share vs organik, per saluran & per jenis).
- **Bagikan ke Story**: opsi **"📸 Bagikan ke Story"** di `ShareButton` (menu SELALU terbuka saat diklik → native share jadi item "📱 Bagikan…" agar opsi Story terjangkau di HP). HP: `navigator.share({files:[png]})` → user pilih Instagram → posting Story (+ link sticker manual); desktop: unduh PNG. Atribusi `utm_medium=story`. Tanpa migrasi.
- **Desain kartu Story** (`lib/story-card.ts` `buatKartuStory()`, canvas **1080×1920**, tanpa dependency): mengikuti gaya kartu artikel KidzPlayful — latar krem, blob dekoratif (biru kanan-atas, kuning kiri-bawah, busur putus-putus, kilau/hati/bintang garis), **logo `public/logo.png`**, **judul dua warna** (baris terakhir teal), garis bawah kuning, subjudul, **foto besar**, **kartu pratinjau tautan** (thumbnail + label + judul + panah), dan tombol CTA sebagai elemen terakhir.
  - **Opsi**: `{ judul, subjudul?, labelKartu, ajakan?, gambar? }`. Teks per jenis konten ada di `TEKS_STORY` (`ShareButton.tsx`): artikel/kelas/game punya label kartu & ajakan sendiri. `subjudul` diisi `text` **hanya bila berbeda dari judul**, supaya kalimat yang sama tidak tampil dua kali.
  - **Sengaja TIDAK ada** (dihapus atas permintaan pemilik): pil badge "Artikel Baru", baris footer "Swipe up / Klik tautan…", dan baris URL di dasar kartu. Judul karena itu dimulai lebih tinggi (tepat di bawah logo) dan CTA menjadi elemen terakhir; busur putus-putus digeser naik agar tidak menyentuh baris judul. URL tetap ikut terkirim sebagai **teks pendamping** di `navigator.share`, jadi penerima tetap mendapat tautannya.
  - **Font**: memakai font brand lewat variabel CSS `--font-baloo`/`--font-quick` yang dihasilkan `next/font` (nama family ter-hash → dibaca via `getComputedStyle`), didahului `document.fonts.ready` + `document.fonts.load()`. Gagal → jatuh ke `system-ui`, kartu tetap terbaca.
  - **Tata letak dipatok dari tepi bawah** (CTA → kartu pratinjau → foto) sehingga judul 1–3 baris tidak merusak komposisi; foto mengisi sisa ruang dengan tinggi minimum. Ornamen yang menimpa foto **digambar setelah foto** — kalau sebelum, tertutup penuh karena foto hampir selebar kanvas.
  - **Toleran**: logo satu origin (aman); foto konten `crossOrigin='anonymous'` → bila CORS/404 gagal, kartu tetap dibuat dengan panel lembut + emoji, bukan gagal total.
  - **Cara memeriksa hasilnya**: render sungguhan bisa diambil lewat UI dengan Playwright (buka `/artikel/<slug>` → Bagikan → pilih item menu → tangkap `download`). Ini satu-satunya cara melihat output canvas; jangan mengandalkan pembacaan kode saja untuk perubahan tata letak.
- **Bagikan ke Feed (1:1)** — `lib/feed-card.ts` `buatKartuFeed()`, **1080×1080**:
  - **Kenapa 1:1 dan bukan 4:5**: persegi adalah satu-satunya rasio yang **tidak pernah dipotong** — di feed, di grid profil, maupun saat dibagikan ulang. Postingan 4:5 tampil utuh di feed tapi **dipangkas jadi persegi di grid profil**, sehingga tepi atas/bawah hilang.
  - **Tata letak**: teks di kolom kiri (logo → judul dua warna → garis kuning → subjudul → label), foto **membiras ke tepi kanan**, dan **pita ajakan** biru muda di bawah. Foto digambar melewati tepi kanvas supaya hanya sudut kirinya yang tampak membulat.
  - **Isinya SAMA dengan Story** — `ShareButton.isiKartu()` adalah satu-satunya sumber untuk kedua kartu, jadi keduanya tidak bisa berbeda isi.
  - **Penjamin "tidak ada yang terpotong": `ukuranPas()`** (`kartu-bersama.ts`) mencari ukuran font TERBESAR yang benar-benar muat — jumlah baris ≤ batas **dan** setiap baris ≤ lebar kolom. `bungkusUkur()` saja tidak cukup: satu kata yang lebih lebar dari kolom tetap dipaksa jadi satu baris dan menjorok keluar. Dipakai untuk judul, subjudul, dan teks CTA. Ada unit test-nya (`__tests__/kartu-bersama.test.ts`, memakai pengukur teks palsu).
  - **Foto Feed dipasang `contain` (`gambarMuat`), BUKAN `cover`** — ini keputusan penting. Sampul artikel KidzPlayful sering **memuat tulisan**; memotongnya memenggal kata, dan itulah keluhan nyata yang muncul ("gambar kepotong"). Panel kanan diberi latar `BIRU_MUDA` + bingkai putih pada kotak nyata foto, supaya ruang di sekitar foto terbaca sebagai bingkai, bukan kesalahan. `gambarMuat()` mengembalikan kotak foto setelah diskalakan agar bingkai/bayangan pas.
  - **Judul & subjudul tidak boleh dipotong**: judul memakai `ukuranPas` sampai **5 baris, minimum 26px**; subjudul membatasi jumlah barisnya dari **ruang yang benar-benar tersisa** (`Math.floor(sisa / 34)`), bukan angka tetap — supaya judul panjang tidak mendorong subjudul menabrak pita bawah. Versi pertama memakai 3 baris/40px dan memotong judul panjang dengan "…".
  - **Ornamen adaptif**: busur putus-putus di kolom kiri hanya digambar bila `y < 640` (masih ada ruang). Pada artikel berjudul panjang, kolom teks terisi penuh dan ornamen tetap akan menabrak subjudul.
  - `gambarCover` juga menerima **`fokusY`** (bidik vertikal saat memang harus memotong) — dipakai bila suatu saat butuh `cover` pada kotak portrait, karena crop tengah memenggal wajah.
- **`lib/kartu-bersama.ts`** — palet, `bungkusTeks`/`bungkusUkur`/`ukuranPas`, `muatGambar`, `keluarga`/`siapkanFont` (font brand di canvas), `jalurKotakBulat`/`gambarCover`/`bayangan`, ornamen (`busurPutus`, `kilau`, `bintangGaris`, `hatiGaris`), dan tipe **`IsiKartu`**. Story & Feed hanya berisi tata letaknya masing-masing.

### 📺 Video — `/admin/video`
- **File**: `admin/video/page.tsx` (query + hapus/toggle inline) → `VideoForm.tsx`.
- **Server action**: `buatVideo`, `hapusVideo`, **`setBolehTrialVideo`** (toggle Trial ✓/✗) (`admin-konten.ts`); parse YouTube ID via `ekstrakYoutubeId`.
- **Endpoint**: `video` (+`boleh_trial`).

### 🎟️ Paket Langganan — `/admin/paket` (migrasi 0089)
- **File**: `admin/paket/page.tsx` → `PaketAdmin.tsx`. Reader `lib/data/paket.ts`, action `paket-actions.ts`.
- **Model**: langganan **ditagih per ANAK** dan **statusnya menempel pada anak** (`langganan_anak`), bukan akun. Satu akun boleh punya anak Preschool dan anak Basic sekaligus.
- **Semua hak akses adalah DATA** di baris `paket_langganan` (`akses_ide_bermain`, `akses_game`, `akses_video`, `akses_komunitas`, `worksheet`, `rapor_bulanan`, `konsultasi_gratis_jumlah` + `_satuan`), plus `harga_bulanan` (per anak) dan `diskon_keluarga jsonb` (aturan bertingkat `[{min_anak,persen|nominal}]`). Mengubah harga/fasilitas **tidak perlu deploy**.
- **`kode` paket tidak boleh diubah** setelah dipakai: nilainya tersimpan di peta `diskon_paket` tiap event & produk. `updatePaket` sengaja membuang `kode` dari payload.
- **Menu `paket` masuk daftar `SENSITIF`** di `menu-admin.ts` → bawaannya hanya super user, karena menyangkut harga.

> **⚠️ SATU tempat keputusan hak akses: `lib/domain/entitlement.ts`.** Sebelum 0089, akses ditentukan `dibatasiTrial(status)` yang tersebar di 7 halaman dan hanya mengenal dua keadaan. Dengan paket berjenjang + status per anak, cabang boolean seperti itu mustahil benar. Aturannya sekarang:
> - **`hakAksesAnak(baris, paketMap, trial, sekarang)`** — periode berbayar anak → bila belum pernah bayar, masa trial AKUN (trial memang milik akun) → tenggang memakai paket terakhir → selebihnya kadaluarsa. Dipakai `/main`, `/ortu`, `/pilih-game` lewat `getHakAnak(anakId)`.
> - **`hakAksesAkun(hakAnak[])`** — untuk fitur **tanpa konteks anak** (diskon event & produk, Komunitas, detail materi): memakai **paket TERTINGGI** (`urutan` terbesar) di antara anak yang aktif. Satu keranjang tak bisa memakai dua tarif, dan memilih yang tertinggi adalah satu-satunya aturan yang tak pernah merugikan pelanggan — **wajib ditulis di UI**, jangan disembunyikan.
> - **Gagal baca master paket → hak KOSONG**, bukan lemparan galat: kegagalan tidak boleh membuka fasilitas berbayar, juga tidak boleh mematikan halaman.
> - **Fasilitas berbayar default TERKUNCI**: prop `bolehWorksheet` di `KelasIsi` berbawaan `false`, sehingga pemanggil yang lupa memasang hak akan mengunci — bukan membocorkan. Materi bertanda `kelas_bermain.worksheet_terbuka` tetap terbuka untuk semua sebagai contoh gratis.
> - **Diskon per paket**: `persenUntukPaket(item, kodePaket)` membaca peta `diskon_paket` per item; `0` yang **ditulis admin** berarti "sengaja tanpa diskon" dan tidak jatuh ke kolom lama `diskon_langganan_persen`. Peta dipilih ketimbang kolom per paket supaya paket ketiga tak butuh migrasi.
> - **Lama trial jadi setelan** (`pengaturan_trial.trial_hari`, bawaan **30**) dan paket acuannya `trial_paket_id` (Basic). `TRIAL_HARI` di `domain/trial.ts` kini hanya cadangan; `statusLangganan`/`computeTrialEnd`/`ringkasanLangganan` menerimanya sebagai parameter.
> - **Semua kolom 0089 dibaca TOLERAN** (coba dengan kolom baru, ulangi tanpa kolom itu bila gagal) di `publik.ts`, `kelas/[id]`, `event-actions`, `pengaturan-trial` — kode tayang sebelum migrasi manual dijalankan.
>
> `dibatasiTrial` **masih dipakai di dua tempat dan itu disengaja**: batas jumlah anak untuk yang belum berlangganan (`api/anak`, `pilih-anak/actions`) memakai `trial_maks_anak`, karena keputusan pemiliknya adalah **tanpa batas anak per paket**.

> **🐞 Bug "Hentikan langganan anak tidak berhasil" — 21 Agu 2026 (migrasi 0094).** Laporan pemilik: menekan **Hentikan** di `/admin/langganan` tampak tak berpengaruh, halaman ortu menyebut anaknya berhenti, **tapi konsultasi online tetap bisa dipakai gratis**. Ada **tiga** sebab terpisah, dan ketiganya nyata:
>
> 1. **`hentikanPaketAnak` menyetel `aktif_sampai = hari ini`.** Di sisi SQL (`la.aktif_sampai >= current_date` dalam RPC `daftar_konsultasi`) hari itu **masih dihitung aktif**, jadi anak itu tetap memakai **kuota konsultasi gratis** dan **diskon member**. Sekarang periodenya diakhiri **kemarin (WIB)**.
> 2. **`paket_id` dibiarkan terisi**, sehingga anak itu jatuh ke **masa tenggang** (`TENGGANG_HARI = 3`) yang mengembalikan **hak paket PENUH**. Penghentian oleh admin bukan kelupaan bayar, jadi `paket_id` kini **dikosongkan** — tanpa paket, cabang tenggang di `hakAksesAnak` tak berlaku dan statusnya langsung `kadaluarsa`. Riwayat pembayaran tetap utuh di `pembayaran_langganan`/`tagihan_langganan`; `langganan_anak` menyimpan keadaan **sekarang**, bukan riwayat.
> 3. **Batas hari berbeda antara TypeScript dan SQL.** `hakAksesAnak` membandingkan `Date` dengan `aktif_sampai + 'T00:00:00Z'`, jadi langganan yang berakhir **hari ini** dianggap habis sejak **07:00 WIB** — hari terakhir yang sudah dibayar hilang dan statusnya turun ke `tenggang`; sementara SQL menganggapnya masih aktif. Kini keduanya memakai **tanggal WIB**: `tanggalWIB(sekarang) <= aktif_sampai` di TypeScript, dan `public.hari_ini_wib()` (fungsi baru di 0094, `stable`) di SQL. Masa berlaku **voucher** di RPC yang sama ikut dipindah ke WIB — tanggalnya diisi admin dalam WIB.
>
> **Koreksi atas 0094 (migrasi 0095).** Baris `revoke all on function public.hari_ini_wib() from public` di 0094 saya tulis dengan anggapan itu menutup pemanggilan lewat kunci anon. **Tidak.** Supabase memberi `EXECUTE` **langsung ke peran `anon`/`authenticated`**, bukan lewat PUBLIC, jadi `/rest/v1/rpc/hari_ini_wib` tetap menjawab `200 "2026-08-21"` dengan kunci anon. Terbukti dari probe, bukan dari membaca SQL. Dampaknya **nol untuk data** (fungsi itu hanya mengembalikan tanggal hari ini WIB), tapi polanya menyesatkan, jadi 0095 mencabutnya dari `anon` secara eksplisit — dan aturan umumnya masuk ke `CLAUDE.md`.
>
> Tambahan yang ikut diperbaiki karena berasal dari akar yang sama:
> - **`.update().eq(...)` tanpa baris yang cocok BUKAN error** — aksi lama tetap menjawab `{ok:true}` sehingga admin diberi tahu "dihentikan" padahal tak ada apa pun yang berubah. Sekarang memakai `.select('anak_id')` dan melaporkan *"belum punya baris langganan — tak ada yang dihentikan"*.
> - **Label admin yang menyesatkan**: barisnya selalu berbunyi `"<paket> · s/d <tanggal>"` selama `aktifSampai` terisi, termasuk sesudah dihentikan. Kini ada `ketStatus()`: `s/d` (aktif) · `berakhir` (lewat) · `dihentikan · berakhir …` (paket kosong) · `belum berlangganan`. Tombol **Hentikan** hanya muncul untuk yang **masih aktif**, dan tombol hijau berbunyi Perpanjang/Aktifkan sesuai keadaan nyata — bukan sekadar "ada tanggal".
> - **`setPaketAnak` memakai tanggal WIB** sebagai dasar perpanjangan; dengan `new Date()` mentah, aktivasi antara 00:00–07:00 WIB memberi periode **kurang satu hari**.
>
> **Daya gigit tesnya diuji, bukan diasumsikan** (`domain/__tests__/entitlement.test.ts`, 18 tes): dua mutasi yang mengembalikan perilaku lama — batas hari dibuat eksklusif lagi, dan syarat `paketAnak` pada cabang tenggang dilepas — masing-masing menjatuhkan 2 dan 4 tes. Salah satu tes sengaja mendokumentasikan **bentuk baris hasil penghentian versi lama** supaya tak ada yang "menyederhanakannya" kembali.
>
> **Catatan operasional:** anak yang sudah dihentikan **sebelum** perbaikan ini masih menyimpan `paket_id` lama, jadi tekan **Hentikan** sekali lagi setelah rilis untuk benar-benar mencabutnya.

### 🧾 Pilih Paket & Tagihan — `/langganan` (migrasi 0090)
- **File**: `app/langganan/page.tsx` → `PilihPaketForm.tsx`. Reader `lib/data/tagihan.ts`; action `tagihan-actions.ts` (ortu) & `tagihan-admin-actions.ts` (admin).
- **Bentuk tagihan**: induk `tagihan_langganan` + **baris item per anak** `tagihan_langganan_item` (`anak_id`, `paket_id`, `harga` snapshot). Bukan satu kolom rincian — admin harus bisa melihat "siapa dapat paket apa, berapa" saat verifikasi, dan **paket campur** (kakak Preschool, bayi Basic) tak perlu perlakuan khusus.
- **Hitungan uang** ada di `lib/domain/langganan-harga.ts` (murni, 13 tes): `subtotal = Σ harga paket × bulan` → **diskon keluarga** (aturan bertingkat, `min_anak` terbesar yang terpenuhi) → **voucher** (dihitung dari nilai SETELAH diskon keluarga) → total (tak pernah minus). Modul yang sama dipakai **layar pratinjau dan server**, jadi tak ada dua rumus.
- **Diskon keluarga pada paket campur** memakai aturan dari **paket tertinggi di tagihan itu**, dan aturan yang dipakai **ditulis di layar**. Alternatifnya (menghitung per kelompok paket) lebih adil secara matematis tapi sulit dijelaskan ke orang tua dan sulit diverifikasi manual.
- **Alur**: buat tagihan → transfer (`getPengaturanBayar`: rekening + QRIS) → unggah bukti (`kompresGambar` 1280/0.8 → folder `bukti/`) → admin **verifikasi** → tiap item diaktifkan. Bisa dibatalkan selama `menunggu_bayar`, dan kuota vouchernya dilepas.
- **Turun/naik kelas**: `langganan_anak.paket_berikutnya_id` disetel orang tua (`setPaketBerikutnya`) dan **berlaku saat perpanjangan** — hak periode berjalan tak berubah karena sudah dibayar. Naik kelas di tengah periode = bayar satu bulan penuh, **tanpa prorata**, dinyatakan terbuka di layar.
- **Verifikasi admin memanggil `setPaketAnak` (A1)**, bukan menulis `langganan_anak` langsung — supaya aturan "perpanjang dari `max(hari ini, aktif_sampai)`" hanya ada di satu tempat. Ledger dicatat sebesar **total net** (kategori `membership`, `ref_tipe='tagihan_langganan'`); penolakan menghapus baris ledger **dan** melepas kuota voucher.

> **⚠️ Kolom uang & status tagihan dilindungi TRIGGER, bukan hanya policy.** RLS Postgres tak bisa membatasi per kolom, jadi `cegah_ubah_tagihan` + `cegah_ubah_langganan_anak` (0090) menegakkan bahwa orang tua **hanya** boleh menyentuh `bukti_url` (plus transisi `menunggu_bayar → menunggu_verifikasi`) dan `paket_berikutnya_id`. Tanpa itu, ia bisa `PATCH` lewat REST dengan `{"total":0}` atau `{"status":"diterima"}` dan berlangganan tanpa membayar. Polanya meniru `cegah_self_admin` (0056).
>
> **Worksheet ber-KUOTA (migrasi 0091), bukan sekadar boleh/tidak.** Permintaan pemilik: Basic boleh mengunduh worksheet tapi **tidak semua**. Aturannya di `paket_langganan`: `worksheet=false` → tak bisa sama sekali · `worksheet=true, worksheet_kuota_jumlah=0` → **tanpa batas** · `>0` → maksimal N per `worksheet_kuota_satuan` (`bulan`|`langganan`). Logikanya di `domain/kuota-worksheet.ts` (murni, 8 tes; satuan `bulan` memakai awal bulan **WIB**, bukan UTC).
> **Tombolnya WAJIB server action, bukan `<a href>`**: kalau URL berkasnya dirender langsung, kuota hanya hiasan karena tautannya bisa diklik berulang atau disalin. `WorksheetBtn` memanggil `mintaWorksheet(kelasId)` yang memeriksa kuota, **mencatat unduhan lebih dulu** (`unduhan_worksheet`), lalu baru memberi URL-nya — pencatatan yang gagal berarti berkas tidak diberikan, supaya kuotanya tak bisa dilewati dengan sengaja membuat pencatatan gagal. Tabel `unduhan_worksheet` **tidak punya policy DELETE untuk ortu**: riwayat yang bisa dihapus sendiri = kuota yang bisa direset sendiri.
> Materi bertanda `worksheet_terbuka` (contoh gratis) **tidak** memakai kuota. Kuota dihitung **per akun**, bukan per anak — satu berkas dipakai bersama di rumah, dan tombolnya juga muncul di halaman tanpa konteks anak.
>
> **Diskon keluarga: satu jenis per aturan.** Form memakai pemilih jenis (Persen / Rupiah) + **satu** field nilai, dan `bersihkanAturan` membuang jenis yang tak dipilih. Sebelumnya kedua kolom bisa terisi sekaligus dan yang berlaku hanya persen — terlihat pada data nyata (`{persen:10, nominal:10000}`), sehingga admin mengira ada dua diskon padahal nominalnya diam saja.
>
> **Nominal DIBUKTIKAN ULANG saat verifikasi.** Policy INSERT `tagihan_langganan` hanya memastikan `ortu_id = auth.uid()` — jadi orang tua **bisa** memasukkan baris tagihan langsung lewat REST dengan angka karangan, dan trigger 0090 hanya menjaga UPDATE. Verifikasi adalah satu-satunya titik di mana uang dicatat & hak akses diberikan, jadi `verifikasiTagihan` menghitung ulang `subtotal`, diskon keluarga, dan potongan voucher lalu **menolak bila tidak cocok** dengan yang tersimpan.
> Dasarnya **harga snapshot di rincian** (`tagihan_langganan_item.harga`), **bukan** harga master saat ini — kalau memakai harga master, mengubah harga paket akan membuat tagihan lama yang sah ikut ditolak padahal orang tua sudah membayar harga yang berlaku saat itu. Aturan diskon keluarga tetap dari master. Snapshot harga yang tak wajar tetap terlihat admin karena rinciannya ditampilkan per anak di antrean.
>
> **Tagihan bertotal nol**: `subtotal = 0` berarti **harga paket belum diatur admin** (paket di-seed Rp 0) → `buatTagihan` menolak dengan pesan jelas, supaya orang tua tidak terjebak menunggu bukti transfer yang tak ada nominalnya. Tapi `total = 0` dengan subtotal > 0 memang sah (diskon + voucher menutup semuanya) → tagihan langsung berstatus `menunggu_verifikasi` tanpa bukti, dan layarnya berkata "tidak ada yang perlu ditransfer".
>
> **Voucher langganan**: `voucher.berlaku_langganan` + `voucher_redeem.ref_tipe='langganan'`. Cakupan `jenis` di `domain/voucher.ts` kini `'event' | 'produk' | 'langganan'`, dan kolom barunya dibaca **dengan cadangan** supaya voucher event/produk yang sudah jalan tak mati sebelum migrasi 0090 dijalankan.

### 💳 Langganan — `/admin/langganan`
- **File**: `admin/langganan/page.tsx` (query inline + `Pager.tsx`) → `AktifkanForm.tsx`. Util `@/lib/domain/trial` (`statusLangganan`), `@/lib/format` (`linkWa`), `@/lib/metode` (`METODE_BAYAR`).
- **Fungsi data**: query inline `profiles` (member + embed anak & langganan) & `langganan` (jatuh tempo ≤ 7 hari untuk tombol WA pengingat); `getPengaturanBayar()` (nominal default).
- **🔎 Cari nama orang tua / anak / email** (`?q=`): **server-side**, karena daftar member dipaginasi 30/halaman — menyaring di klien hanya akan mencari di halaman yang sedang terbuka. Formnya `<form method="get">` biasa (bukan komponen klien), dan karena hanya mengirim `q`, menekan Cari otomatis membuang `hal` sehingga hasil selalu mulai dari halaman 1.
  - **Kenapa dua query**: nama anak ada di tabel lain, dan PostgREST tak bisa meng-OR-kan syarat pada tabel induk dengan syarat pada tabel anak dalam satu query (`anak.nama=ilike.*q*` + `!inner` bersifat AND). Jadi `anak` di-query lebih dulu untuk mengumpulkan `ortu_id`, lalu digabung ke filter member sebagai `or=(nama_tampilan.ilike.…,email.ilike.…,id.in.(…))`.
  - **Sanitasi wajib**: kata kunci dibersihkan dari `% _ , ( ) " * \` sebelum masuk `or=(...)`. Koma dan kurung **memecah bentuk klausa `or`** (bukan sekadar hasil salah), sedangkan `%`/`_` adalah wildcard ILIKE. Karakter itu **dibuang**, bukan di-escape — kata kunci nama tak pernah membutuhkannya. Bentuk ketiga query sudah diuji langsung ke PostgREST produksi (semuanya `200`, bukan `400`).
  - **Batas 1.000** id anak (`BATAS_ANAK`) agar kata kunci super umum tidak meledakkan panjang URL; bila batas itu tersentuh, halaman **mengatakannya** ("persempit kata kuncinya") alih-alih memotong diam-diam.
  - Blok **🔔 Perlu diingatkan** ikut disaring dengan kata kunci yang sama (di JS — daftarnya kecil & sudah termuat penuh) supaya kedua bagian halaman konsisten. `Pager` kini menyambung `hal` dengan `&` bila `basePath` sudah membawa query, jadi kata kunci tidak hilang saat pindah halaman.
- **Panel paket per anak** (0089): tiap kartu member memuat daftar anaknya + dropdown paket + jumlah bulan → `setPaketAnak` (`langganan-anak-actions.ts`). Inilah yang membuat paket sudah berlaku sebelum halaman pilih-paket mandiri (sub-proyek A2) ada. **Perpanjangan dihitung dari `max(hari ini, aktif_sampai)`** — memperbaiki perilaku `aktifkanLangganan` yang menyetel `hari ini + 1 bulan` sehingga membayar lebih awal menghanguskan sisa hari.
- **Server action**: `aktifkanLangganan` (`admin-bisnis.ts`).
- **Endpoint**: `profiles`, `langganan`, `anak` (pencarian), `pengaturan_pembayaran`; `aktifkanLangganan` → `langganan` (update +1 bln), `pembayaran_langganan` (insert), `catatLedger` (kategori `membership`).

### 🧒 Anak & Gamifikasi — `/admin/anak`
- **File**: `admin/anak/page.tsx` → `AnakGamiForm.tsx`. Konstanta `LENCANA` (`domain/gamifikasi`).
- **Fungsi data**: `getAnakUntukAdmin()` (`admin-anak.ts`) — anak + koin/streak/lencana + **jenis kelamin, tgl lahir, nama & email ortu**.
- **Server action**: `setStreakKoin`, `toggleLencana` (`admin-anak-actions.ts`).
- **Endpoint**: `anak`, `lencana_anak`.

### 🏆 Tantangan (stok gamifikasi) — `/admin/tantangan`
- **File**: `admin/tantangan/page.tsx` → `TantanganForm.tsx` + `TantanganList.tsx`.
- **Fungsi data**: `getTantanganAdmin()`, `getOpsiTantangan()` (`tantangan-kustom.ts`).
- **Server action**: `simpanTantangan`, `setAktifTantangan`, `hapusTantangan` (`tantangan-kustom-actions.ts`).
- **Endpoint**: `tantangan_kustom`, `paket_aset`, `tema`.

### 💰 Pembayaran — `/admin/pengaturan-bayar`
- **File**: `admin/pengaturan-bayar/page.tsx` (form inline).
- **Fungsi data**: `getPengaturanBayar()` (`pengaturan-bayar.ts`, fallback `DEFAULT_BAYAR`).
- **Server action**: `simpanPengaturanBayar` (`admin-bisnis.ts`).
- **Endpoint**: `pengaturan_pembayaran` (baris `id=1`).

### ⏳ Trial — `/admin/pengaturan-trial`
- **File**: `admin/pengaturan-trial/page.tsx` (batas anak + daftar kelas/tema/video dengan toggle Trial ✓/✗ terpusat).
- **Fungsi data**: `getPengaturanTrial()` (`pengaturan-trial.ts`, fallback `DEFAULT_TRIAL`), `getKelasSemua()`, query `tema`/`video`.
- **Server action**: `simpanPengaturanTrial` (`admin-bisnis.ts`, batas anak); `setBolehTrialKelas` (`kelas-bermain-actions.ts`), `setBolehTrialTema`/`setBolehTrialVideo` (`admin-konten.ts`).
- **Endpoint**: `pengaturan_trial` (id=1), kolom `boleh_trial` di `kelas_bermain`/`tema`/`video`.
- Rincian gating: lihat **§7 Pembatasan Akses Trial**.

### 🤝 Sponsor — `/admin/sponsor`
Menu top-level tersendiri (sumber pendapatan). Rincian lengkap: lihat **§6 Modul Sponsor**.

### 📊 Laporan Member — `/admin/laporan`
- **File**: `admin/laporan/page.tsx` (query inline). Domain `ringkasanLangganan` (`domain/laporan`).
- **Endpoint**: `langganan`; **RPC `laporan_engagement()`** (agregat dari `hasil_main`).

### 💬 Komunitas (moderasi) — `/admin/komunitas`
- **File**: `admin/komunitas/page.tsx` (query + aksi inline).
- **Server action**: `moderasiPostingan`, `hapusPostinganAdmin`, `moderasiKomentar`, `hapusKomentarAdmin`, `tuntaskanLaporan` (`admin-komunitas.ts`).
- **Endpoint**: `laporan`, `postingan`, `komentar`.

### ⭐ Masukan (Feedback) — `/admin/feedback`
- **File**: `admin/feedback/page.tsx` (read-only). Label `@/lib/feedback-tipe`.
- **Fungsi data**: `getFeedbackAdmin()` (`feedback.ts`) — 200 masukan + email ortu; NPS dihitung di page.
- **Endpoint**: `feedback` (join `profiles`).

### 🍎 Kelola Guru — `/admin/guru`
- **File**: `admin/guru/page.tsx` → `GuruAdmin.tsx`.
- **Fungsi data**: `getDaftarGuru()` (`admin-guru.ts`).
- **Server action**: `jadikanGuru(email)`, `cabutGuru(id)` (`admin-guru-actions.ts`).
- **Endpoint**: `profiles` (set `is_guru`).

### 🧠 Kelola Psikolog — `/admin/psikolog`
- **File**: `admin/psikolog/page.tsx` → `PsikologAdmin.tsx` (pola Kelola Guru).
- **Fungsi data**: `getDaftarPsikolog()` (`admin-psikolog.ts`).
- **Server action**: `jadikanPsikolog(email)`, `cabutPsikolog(id)` (`admin-psikolog-actions.ts`).
- **Endpoint**: `profiles` (set `is_psikolog`). Dashboard kerjanya di `/psikolog` (lihat §8).

### 👤 Pengguna & Role — `/admin/users`
- **File**: `admin/users/page.tsx` (form inline; `BuatUserForm.tsx` di atas; toggle role `<form action={setRole}>`).
- **Fungsi data**: `getPengelolaUserTerjamin()` (guard + status superuser), `getDaftarUser(q)` (`admin-users.ts`).
- **Server action** (`admin-users-actions.ts`): `setRole(formData)`, `tambahUserRole(formData)` (assign role ke akun yang sudah ada), **`buatUser(formData)`** (buat akun auth baru + role).
- **Endpoint**: `profiles` (baca role + update kolom role; super user otomatis set `is_admin`). `buatUser` juga panggil **`auth.admin.createUser`** (service-role).
- **Guard/Role**: `getPengelolaUserTerjamin()` (admin **atau** super user). Role tinggi (admin/superuser) hanya bisa diatur super user; tak bisa cabut super user dari diri sendiri.

#### ➕ Buat User baru
- **File**: `admin/users/BuatUserForm.tsx` (client) → server action `buatUser`.
- **Alur**: `createAdminClient()` (`lib/supabase/admin.ts`, service-role, `import 'server-only'`) → `auth.admin.createUser({email,password,email_confirm:true})` (akun langsung aktif) → `profiles.update({nama_tampilan, [kolom role]})`.
- **Endpoint**: Supabase **Auth Admin API** + tabel `profiles`. Butuh env **`SUPABASE_SERVICE_ROLE_KEY`**.
- **Guard/Role**: `pengelola()` (admin/superuser). Role tinggi hanya oleh superuser. `buatUser` **mengembalikan `{ok,error}`** (bukan throw) agar pesan error tidak diredaksi Next.js di produksi; error ditampilkan inline di form.

#### 🔐 Akses Menu — `/admin/akses-menu` (khusus Super User)
- **File**: `admin/akses-menu/page.tsx` (tabel matriks Role × Menu, checkbox `name="${role}_${menu}"`).
- **Katalog**: `lib/menu-admin.ts` — `MENU_ADMIN` (daftar menu), `ROLE_AKSES` (admin/investor/guru), `DEFAULT_AKSES`, `keyMenuDariPath()`, `menuUntukRole()`.
- **Fungsi data**: `getMenuAkses()` (`lib/data/pengaturan-menu.ts`) baca `pengaturan_menu.akses`; `getAksesAdmin()` (`admin.ts`) hitung menu yang boleh untuk user aktif.
- **Server action**: `simpanMenuAkses(akses)` (`admin-bisnis.ts`) → update `pengaturan_menu.akses` + `revalidatePath('/admin','layout')`.
- **Endpoint**: tabel `pengaturan_menu` (single-row id=1, kolom `akses` jsonb `{admin,investor,guru}`).
- **Guard/Role**: `getSuperuserTerjamin()` (hanya super user). Super user = akses semua menu (matriks tak berlaku untuknya). Enforcement rute di `src/proxy.ts`.
- **Akses Fitur (Admin, Guru & Psikolog)**: matriks kedua di halaman yang sama (Role `ROLE_FITUR` = admin/guru/psikolog × `FITUR_AKSES` = **chat, nilai, produk, event, materi**). Kolom **Admin** berguna untuk akun psikolog/guru yang juga diberi role admin — izinnya di-union antar-role (`fiturUntukRole`), admin default semua. Katalog di `menu-admin.ts` (`FITUR_AKSES`, `DEFAULT_FITUR`, `fiturUntukRole()`, penanda versi `FITUR_MARK` agar config lama tetap mengaktifkan chat/nilai); baca `getFiturAkses()` (`pengaturan-menu.ts`), simpan `simpanFiturAkses()` (`admin-bisnis.ts`) → `pengaturan_menu.fitur` jsonb `{guru,psikolog}`. Enforcement: **nilai** (`guru-actions.ts` `simpanCatatan` + `GuruNilai`), **chat** (`konsultasi-actions.ts` `kirimPesan` + `ChatKonsultasi nonaktif`), rekomendasi (`rekomendasi-item-actions.ts`).

### 📣 Reminder Event — `/admin/reminder`
- **File**: `admin/reminder/page.tsx` → `ReminderAdmin.tsx`. Util `formatTanggal`, `linkWa`.
- **Fungsi data**: `getReminderPendaftaran()` (`admin-reminder.ts`) — pendaftaran "diterima" + event (+`pesan_reminder`) + `kelas` + ortu (no_wa).
- **Server action**: `tandaiReminder(pendaftaranId, terkirim)`, **`simpanPesanReminder(eventId, pesan)`** (`admin-reminder-actions.ts`).
- **Pesan WA manual per event (0085)**: kolom **`event.pesan_reminder`** — textarea + Simpan per event di halaman reminder. Pesan WA disusun util murni **`domain/reminder.ts susunPesanReminder`** (teruji): sapaan nama ortu → teks pengingat menyebut judul → detail (📅 judul, 🗓️ tanggal+jam, 📍 lokasi, 🧒 nama anak, 🏷️ kelas bila baby/toddler) → pesan manual → tanda tangan. Baris opsional dilewati bila datanya kosong.
- **🕐 Jam di pesan mengikuti KELAS pendaftaran** — `domain/reminder.ts` **`jadwalUntukKelas(ev, kelas)`** (teruji, 5 kasus). Sebelumnya pesan memakai `event.jam_mulai/jam_selesai` level atas; pada event yang **dipisah Baby/Toddler** kolom itu sering **kosong**, sehingga pesan terkirim **tanpa jam sama sekali**. Kini jadwal diambil dari `baby_*`/`toddler_*` sesuai kelas, dan jatuh ke jadwal event untuk kelas `gabungan` atau bila kolom kelasnya kosong. Tanggal pun ikut — kelas Toddler bisa berbeda hari dari Baby.
- **🔎 Pencarian nama** (seperti halaman pendaftar): kotak cari mencakup **nama anak, nama orang tua, dan judul event**. Bila judul event yang cocok, seluruh pesertanya ditampilkan; selain itu hanya peserta yang cocok, dengan badge `N hasil` di header grup. **Grup yang tidak cocok DISEMBUNYIKAN (`display:none`), bukan di-unmount** — tiap grup memuat textarea pesan reminder, dan meng-unmount-nya akan membuang teks yang belum ditekan Simpan (pola yang sama dengan §3 aturan reset form).
- **Endpoint**: `pendaftaran_event` (+ embed `event` incl `pesan_reminder`, `ortu`; kolom `kelas`), `event` (update `pesan_reminder`).

### 👶 Master Kategori Usia — `/admin/kategori-usia`
Master data rentang usia (dipakai dropdown di form Game). Game dikelompokkan per kategori.
- **File**: `admin/kategori-usia/page.tsx` → `KategoriUsiaAdmin.tsx`.
- **Fungsi data**: `getKategoriUsiaSemua()`, `getKategoriUsiaAktif()` (`kategori-usia.ts`).
- **Server action** (`kategori-usia-actions.ts`, `{ok,error}`): `buatKategoriUsia(nama, usiaMin, usiaMax, urutan)`, `updateKategoriUsia(id, {nama,usiaMin,usiaMax,urutan,aktif})`, `hapusKategoriUsia(id)` (game yang memakainya di-set null via FK; saran **nonaktifkan** bila masih dipakai).
- **Endpoint**: tabel `kategori_usia` (0079: nama, usia_min/max, urutan, aktif; RLS baca authenticated, kelola admin; seed 4). `paket_aset.kategori_usia_id` FK `on delete set null`.

### 🎨 Kelola Tema — `/admin/tema/[id]`
- **File**: `admin/tema/[id]/page.tsx` (query + aksi inline) → `PaketForm.tsx` (+ `TargetEditor`, `@/components/admin/AsetInput`, `@/components/game/Aset`).
- **Server action**: `hapusPaket`, `setStatusTema`, `setMingguIni`, `buatPaket`, `updatePaket` (`admin-konten.ts`, validasi `validasiButir`). **`buatPaket`/`updatePaket` return `{ok,error}`** (bukan throw) agar pesan error DB — mis. CHECK constraint `paket_aset_mesin_check` — tampil jelas di production (pola sama dgn `buatUser`).
- **Penting saat menambah MESIN baru**: selain 5 titik kode (tipe → engine → GameRunner → PaketForm → butir), **wajib migrasi perluas CHECK `paket_aset_mesin_check`** (pola `0025..0037`, terbaru `0074_mesin_calistung.sql`) — tanpa itu INSERT paket ditolak DB.
- **UX form**: `AsetInput` punya prop `tandaiKosong` (sorot merah bila kosong); form Hitung Benda melakukan pra-cek kolom benda kosong dengan pesan spesifik (placeholder "ketik emoji…").
- **Optimasi gambar**: upload gambar dikompres di klien via **`lib/img.ts` `kompresGambar(file,{maksDim,kualitas})`** — downscale + encode WebP (jaga transparansi; SVG/GIF/PDF dilewati; fallback ke asli bila lebih besar/gagal). Titik kompres: AsetInput 512px, ikon tema 256px, **cover kelas** 1280/0.82, **bukti pembayaran** (DaftarForm & BuktiUpload) 1280/0.8, dokumen (UploadDok) 1280/0.8, sampul artikel/gambar produk/banner event 1280/0.82. **Template cetak** (background **sertifikat & stiker** event) dikompres **ringan 2000px/0.9** agar hasil cetak tetap tajam. Hanya **PDF/SVG/GIF** yang dilewati (bukan raster). `<img>` di `Aset`/`Sampul` pakai `loading=lazy`+`decoding=async`.
- **Backfill gambar lama**: skrip lokal **`tools/backfill-kompres.mjs`** (Node + `sharp` devDependency) — kompres file gambar yang sudah ter-upload di bucket `aset`. Default **DRY-RUN** (`node tools/backfill-kompres.mjs`), nyata `--apply`; **menimpa path yang sama** dgn `contentType image/webp` (URL DB tetap valid — render by content-type). Aturan skip di **`tools/backfill-util.mjs` `perluKompres(path,size)`** (teruji vitest): lewati `.webp`, non-gambar, `<300KB`, folder `event/sertifikat*`/`event/stiker*`. Butuh `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` (jangan commit).
- **Kategori usia (0079)**: input range usia game **diganti dropdown Kategori Usia** (master, lihat `/admin/kategori-usia`). Memilih kategori → `usia_min/usia_max` di-snapshot dari range-nya (filter umur `cocokUsia` di PilihGame tetap jalan) + simpan `kategori_usia_id`. Daftar game **dikelompokkan per kategori** (+ grup "Tanpa kategori" utk game lama). `buatPaket`/`updatePaket` menerima `kategoriUsiaId`.
- **Ikon tema = UPLOAD GAMBAR**: `TambahTemaForm.tsx` (client) mengunggah gambar ke `storage 'aset/tema/'` → URL disimpan di `tema.sampul` (kosong → default 🎈). Komponen **`components/Sampul.tsx`** merender `<img>` bila `sampul` URL / emoji bila bukan; dipakai di semua penampil ikon tema (admin & user: MenuAnak, PilihGame).
- **Endpoint**: `tema`, `paket_aset` (+`kategori_usia_id`), `kategori_usia`; `storage.from('aset')` (aset game + folder `tema/`).

---

## 5. Modul Keuangan — per menu

Sub-navigasi: `KeuanganNav.tsx` (client). Semua reader read-only lewat `createClient()` server; server action manual dijaga `adminDb()`.

### 📊 Dashboard CEO — `/admin/keuangan`
- **File**: `keuangan/page.tsx` (baris transaksi jadi `<Link>` ke detail bila punya `ref_tipe`).
- **Fungsi data**: `getDashboardKeuangan()` (revenue/expense/net/saldo/MRR/member/growth), `getLedger({limit:10})`.
- **Endpoint**: `transaksi_keuangan`, `langganan`.

### 🎯 KPI — `/admin/keuangan/kpi`
- **File**: `keuangan/kpi/page.tsx`.
- **Fungsi data**: `getKpi()` (`kpi.ts`) — MRR/ARR/growth, ARPU, churn/retention, LTV, CAC, LTV:CAC, net margin, burn/runway, AOV, DAU/MAU/stickiness.
- **Endpoint**: `langganan`, `pembayaran_langganan`, `transaksi_keuangan`, `aktivitas`.

### 💡 Insight (BI) — `/admin/keuangan/insight`
- **File**: `keuangan/insight/page.tsx` (chart SVG/CSS inline, tanpa dependency).
- **Fungsi data**: `getInsight()` (`kpi.ts`) — tren 12 bln, revenue mix, cohort retention, top produk/event, auto-insight.
- **Endpoint**: `transaksi_keuangan`, `profiles`, `langganan`, `item_pesanan` (+`pesanan`), `pendaftaran_event` (+`event`).

### 📒 Transaksi (Ledger) — `/admin/keuangan/transaksi` & `/[id]`
- **File**: `keuangan/transaksi/page.tsx` (filter GET tanggal/arah/kategori) + `transaksi/[id]/page.tsx` (detail).
- **Fungsi data**: `getLedger({...})`, `getKategoriPengeluaran()`; detail: `getTransaksiDetail(id)` + `labelMetode` (`@/lib/metode`).
- **Semua baris bisa diklik** ke halaman detail (gate by `id`). `getTransaksiDetail` bercabang per `ref_tipe`: `pesanan`(+`item_pesanan`), `pendaftaran`(+`event`), `langganan`(→`pembayaran_langganan`), **`aset`**(→`aset`), **`sponsorship`**(→`sponsorship`+`sponsor`); `manual` (pengeluaran) tampil ringkasan + tautan ke Pengeluaran.
- **Endpoint**: `transaksi_keuangan`, `kategori_pengeluaran`, `profiles`, + tabel sumber sesuai ref.

### 💸 Pengeluaran — `/admin/keuangan/expense`
- **File**: `keuangan/expense/page.tsx` + client `InputRupiah`, `UploadNota`, `BudgetKategoriSelect`.
- **Reset setelah simpan**: ketiga komponen client itu **uncontrolled** by design — lihat §3 "Form + Server Action: aturan reset". Bila menambah field baru di form ini, ikuti aturan itu; kalau tidak, nilainya (termasuk **URL foto nota**) akan tertinggal dan ikut ter-submit pada entri berikutnya.
- **Fungsi data**: `getLedger({arah:'keluar'})`, `getKategoriPengeluaran()`, `getBudgetMap(ym)` (sisa anggaran per kategori).
- **Server action**: `catatPengeluaran`, `hapusTransaksi` (`keuangan-actions.ts`).
- **🎈 Pengeluaran untuk EVENT tertentu** (migrasi **0088**): form pengeluaran punya dropdown *"Untuk event (opsional)"* → disimpan ke kolom baru **`transaksi_keuangan.event_id`**. Riwayat pengeluaran & halaman Transaksi menampilkan badge nama event.
  - **Kenapa kolom baru, bukan `ref_tipe='event'`**: ada unique index `uq_transaksi_ref (ref_tipe, ref_id)` yang memaksa SATU baris per referensi — memakai `ref_tipe` berarti hanya boleh ada satu pengeluaran per event. Selain itu `ref_tipe/ref_id` sudah dipakai `getTransaksiDetail` untuk mencabangkan JENIS sumber transaksi.
  - **`ON DELETE SET NULL`**: menghapus event tidak boleh menghapus catatan keuangannya — uang yang sudah keluar tetap harus tercatat.
  - **Filter per event di `/admin/keuangan/transaksi` kini dua arah**: (a) pemasukan lewat `ref_tipe='pendaftaran'` + `ref_id` milik event itu, (b) pengeluaran lewat `event_id`. `getLedger` menjalankannya sebagai **dua query lalu digabung + dedupe**, bukan satu `.or()`, supaya cabang (b) bisa gagal sendirian saat kolomnya belum ada tanpa menjatuhkan cabang (a).
  - **Toleran**: `getLedger` mencoba `select` dengan `event_id` lalu mengulang tanpa kolom itu bila `42703`; `catatPengeluaran` mengulang insert tanpa `event_id`. Jadi sebelum migrasi 0088 dijalankan, ledger & pencatatan tetap jalan — hanya kaitan event yang belum tersedia.
- **🔁 Revenue IKUT PINDAH saat pendaftar direschedule — by design, bukan kebetulan.** `reschedulePendaftaran` meng-**update `event_id` pada baris pendaftaran yang sama** (bukan membuat baris baru), sementara seluruh jalur revenue per event bersifat **turunan, bukan snapshot**:
  1. `getLedger({eventId})` menurunkan `ref_id` dari `pendaftaran_event` yang `event_id`-nya sekarang;
  2. `getInsight().topEvent` (`kpi.ts`) membaca `pendaftaran_event.select('total,status,event:event_id(judul)')` — join mengikuti `event_id` terkini;
  3. `getTransaksiDetail` menampilkan event lewat join dari baris pendaftaran;
  4. baris ledger-nya sendiri hanya menyimpan `ref_tipe='pendaftaran'` + `ref_id`, dan `keterangan`-nya generik (`'Pendaftaran event'`) — **tidak ada nama/id event yang dibekukan**, jadi tak ada yang bisa basi.
  Konsekuensinya: pemasukan otomatis keluar dari event asal dan masuk ke event tujuan. **Jangan menambahkan snapshot event pada baris ledger pendaftaran** — itu justru akan mematahkan perilaku ini.
  - **Catatan**: `transaksi_keuangan.event_id` (0088) khusus untuk **pengeluaran**; ia TIDAK ikut pindah saat pendaftar direschedule, dan memang tidak boleh — biaya yang sudah dikeluarkan untuk event asal tetap milik event asal.
  - **Perbaikan menyertai**: `reschedulePendaftaran` dulu tidak menghitung ulang snapshot **`kelas`/`kelas_jadwal`**, sehingga setelah pindah event kartu pendaftar masih menampilkan **jadwal event LAMA** (dan bisa menunjuk kelas yang tidak ditawarkan event tujuan). Kini keduanya dihitung ulang terhadap event tujuan.

> **⚠️ Reschedule tidak boleh MENEBAK kelas tujuan** (keluhan nyata: "anak dipindah ke kelas berikutnya, kok masuk kuota Gabungan"). Versi lama menjatuhkan pendaftaran ke `'gabungan'` setiap kali `kelas` lamanya bukan `baby`/`toddler` — dan itu **mencakup `kelas = NULL`**, yaitu semua pendaftaran yang dibuat **sebelum migrasi 0069** serta yang berasal dari event berjadwal tunggal. Dari sisi admin, kategori kelasnya seolah hilang sendiri, padahal event tujuan punya Baby & Toddler.
>
> Aturan sekarang di `reschedulePendaftaran(pendaftaranId, eventBaruId, alasan, kelasTujuan?)`:
> 1. Event tujuan **tanpa** kelas terpisah → `'gabungan'` (memang tidak ada pilihan lain).
> 2. Event tujuan **punya** kelas → pakai `kelasTujuan` dari admin, atau kelas lama bila ditawarkan. Bila **keduanya tidak ada, aksi DITOLAK** dengan pesan yang menyuruh admin memilih — bukan menebak. Ini penerapan aturan umum "jangan menebak dalam senyap" yang sama dengan aturan redirect di §3.
> 3. **Kuota kelas tujuan ditegakkan**, meniru `pindahKelasPendaftaran` yang sejak awal melakukannya. Sebelumnya reschedule sama sekali tidak memeriksa kuota, jadi memindahkan anak ke Baby Class yang sudah penuh berhasil tanpa peringatan.
>
> UI-nya: panel Reschedule kini punya dropdown **kelas di event tujuan**, hanya muncul bila event tujuan memang punya kelas terpisah (`eventsAktif[].kelas` dikirim dari `page.tsx`). Nilai bawaannya kelas saat ini bila tersedia; bila pendaftarannya belum berkategori, ada **saran dari usia anak** (<24 bln = Baby) yang tetap bisa diubah admin.
- **Endpoint**: `transaksi_keuangan`, `kategori_pengeluaran`, `anggaran`; `UploadNota` → `storage.from('aset')` (folder `nota/`, WebP).

### 🖥️ Aset — `/admin/keuangan/aset`
- **File**: `keuangan/aset/page.tsx` + `InputRupiah`, `UploadNota`.
- **Fungsi data**: `getAset()`, `getKategoriAset()`, `getBudgetMap(ym)` (info budget kategori "Aset").
- **Server action**: `simpanAset`, `hapusAset` (`keuangan-actions.ts`); opsi catat kas keluar.
- **Endpoint**: `aset`, `kategori_aset`, `anggaran`; opsional insert `transaksi_keuangan` (kategori `aset`); `storage.from('aset')` (`invoice_url`).

### 🎯 Anggaran & Proyeksi — `/admin/keuangan/anggaran`
- **File**: `keuangan/anggaran/page.tsx` + `InputRupiah`.
- **Fungsi data**: `getAnggaranBulan(ym)` (realisasi vs anggaran), `getForecast(6)` (proyeksi kas), `getKategoriPengeluaran()`.
- **Server action**: `simpanAnggaran` (upsert onConflict `ym,kategori`) (`anggaran-actions.ts`).
- **Endpoint**: `anggaran`, `transaksi_keuangan`.

### 📈 Laporan — `/admin/keuangan/laporan`
- **File**: `keuangan/laporan/page.tsx` + `EksporCsvBtn.tsx` (CSV di browser). Kategori bisa diklik → deep-link ke Transaksi terfilter.
- **Fungsi data**: `getPerBulan(6)`, `getPerKategori('masuk')`, `getPerKategori('keluar')`.
- **Endpoint**: `transaksi_keuangan`.

### 🧾 Pajak / Omzet — `/admin/keuangan/pajak`
- **File**: `keuangan/pajak/page.tsx`. Omzet 12 bln + estimasi PPh Final UMKM 0,5% (info).
- **Fungsi data**: `getPerBulan(12)`.
- **Endpoint**: `transaksi_keuangan`.

### ⚙️ Master Kategori — `/admin/keuangan/master`
- **File**: `keuangan/master/page.tsx` (kelola kategori Pengeluaran & Aset; bawaan tak bisa dihapus).
- **Fungsi data**: `getKategoriAset()`, `getKategoriPengeluaran()`.
- **Server action**: `tambahKategoriPengeluaran`, `hapusKategoriPengeluaran`, `tambahKategoriAset`, `hapusKategoriAset` (`keuangan-actions.ts`).
- **Endpoint**: `kategori_pengeluaran`, `kategori_aset`.

### Data layer keuangan (ringkas)
| File | Fungsi ekspor | Tabel disentuh |
|---|---|---|
| `keuangan.ts` | `getDashboardKeuangan`, `getLedger`, `getPerBulan`, `getPerKategori`, `getKategoriAset`, `getKategoriPengeluaran`, `getTransaksiDetail`, `getAset` + konstanta `KATEGORI_MASUK/KELUAR/LABEL_KATEGORI` | `transaksi_keuangan`, `langganan`, `kategori_aset`, `kategori_pengeluaran`, `pesanan`+`item_pesanan`, `pendaftaran_event`+`event`, `pembayaran_langganan`, `profiles`, `aset` |
| `keuangan-actions.ts` | `catatPengeluaran`, `hapusTransaksi`, `simpanAset`, `hapusAset`, `tambah/hapusKategoriAset`, `tambah/hapusKategoriPengeluaran` (guard `adminDb`) | `transaksi_keuangan`, `aset`, `kategori_aset`, `kategori_pengeluaran` |
| `kpi.ts` | `getKpi`, `getInsight` | `langganan`, `pembayaran_langganan`, `transaksi_keuangan`, `aktivitas`, `profiles`, `item_pesanan`+`pesanan`, `pendaftaran_event`+`event` |
| `anggaran.ts` | `getAnggaranBulan`, `getBudgetMap`, `getForecast` | `anggaran`, `transaksi_keuangan` |
| `anggaran-actions.ts` | `simpanAnggaran`, `hapusAnggaran` (guard admin) | `anggaran` |
| `ledger.ts` | `catatLedger(s,row)`, `hapusLedgerRef(s,tipe,id)` (try/catch) | `transaksi_keuangan` |
| `langganan-status.ts` | `getStatusLangganan(s,userId)`, `getStatusSaya()`, `dibatasiTrial(status)` | `langganan` |
| `investor.ts` | `getInvestorTerjamin()` (guard) | `profiles` |
| `sponsor.ts` | `getSponsorSemua`, `getDealSemua`, `getDeal`, `getRingkasanSponsor` + konstanta `STATUS_SPONSOR`/`LABEL_STATUS`/`JENIS_SPONSOR` | `sponsor`, `sponsorship` |
| `sponsor-actions.ts` | `simpanSponsor/hapusSponsor`, `simpanDeal/hapusDeal`, `setStatusDeal`, `generateInvoice`, `catatPembayaran`, `simpanDokumen`, `batalkanDeal` (guard admin) | `sponsor`, `sponsorship`, `transaksi_keuangan` (ledger utk jenis uang) |
| `pengaturan-trial.ts` | `getPengaturanTrial()` (+ `DEFAULT_TRIAL`) | `pengaturan_trial` |
| `pengaturan-menu.ts` | `getMenuAkses()` (matriks Akses Menu, fallback `DEFAULT_AKSES`) | `pengaturan_menu` |
| `admin.ts` | `getAdminTerjamin`, `getSuperuserTerjamin`, `getAksesAdmin` (guard + hitung menu per role) | `profiles`, `pengaturan_menu` |

### Hook pencatat ledger (basis kas)
- `admin-store-actions.ts` — verifikasi pesanan → `catatLedger` (masuk/`store`/subtotal, ref `pesanan`); `batal` → `hapusLedgerRef`. (Ongkir **bukan** pendapatan.)
- `admin-event-actions.ts` — status "diterima" → `catatLedger` (masuk/`event`/total, ref `pendaftaran`); "ditolak" → `hapusLedgerRef`.
- `admin-bisnis.ts` — aktivasi/perpanjang langganan → insert `pembayaran_langganan` + `catatLedger` (masuk/`membership`/nominal, ref `langganan`).

---

## 6. Modul Sponsor — `/admin/sponsor`

Sumber pendapatan baru. Sponsor bisa **UANG** (masuk ledger kas) atau **BARANG/in-kind** (dicatat nilai, TIDAK masuk kas). Guard admin via `admin/layout.tsx`; investor read-only via RLS.

### 🤝 Daftar & CRUD — `/admin/sponsor`
- **File**: `admin/sponsor/page.tsx` + `InputRupiah`, `EksporCsvBtn`.
- **Fungsi data**: `getSponsorSemua`, `getDealSemua`, `getRingkasanSponsor` (`sponsor.ts`) — ringkasan tunai masuk / nilai in-kind / outstanding.
- **Server action**: `simpanSponsor`, `hapusSponsor`, `simpanDeal` (`sponsor-actions.ts`).
- **Endpoint**: `sponsor`, `sponsorship`.

### 🤝 Detail deal — `/admin/sponsor/[id]`
- **File**: `admin/sponsor/[id]/page.tsx` + `InputRupiah`, `UploadDok` (upload PDF/gambar generik → `storage.from('aset')` folder `dok-sponsor/`).
- **Fungsi data**: `getDeal(id)` (join `sponsor`).
- **Server action**: `setStatusDeal` (pipeline lead→…→selesai), `generateInvoice` (nomor sekuensial `INV-SP-YYYYMM-0001`; **hanya saat status "kesepakatan"** & jenis uang), `catatPembayaran` (→ `catatLedger` kategori `sponsorship` bila jenis uang), `simpanDokumen` (quotation/agreement/bukti), `hapusDeal`.
- **Endpoint**: `sponsorship`, `sponsor`, `transaksi_keuangan` (ledger jenis uang; batal → `hapusLedgerRef`).

### 🧾 Invoice cetak — `/admin/sponsor/[id]/invoice`
- **File**: `admin/sponsor/[id]/invoice/page.tsx` + `InvoiceSponsorView.tsx` (kop **logo KidzPlayful** via `Logo` + `PROFIL`) + `UnduhPdfBtn` (`@media print` A4).
- **Fungsi data**: `getDeal(id)`.

> Integrasi Keuangan: kategori pemasukan **`sponsorship`** ditambahkan di `keuangan.ts` (`KATEGORI_MASUK`/`LABEL_KATEGORI`), `kpi.ts` (`labelKat`), `insight/page.tsx` (`LABEL_KAT`/`WARNA_KAT`) → otomatis muncul di Dashboard/Transaksi/Insight/Pajak. In-kind tidak masuk ledger (hanya ringkasan sponsor).

---

## 7. Pembatasan Akses Trial (diatur admin)

Membatasi user **belum berlangganan** (`status !== 'aktif'` → trial & tenggang; helper `dibatasiTrial()`). Item tetap **tampil tapi terkunci 🔒** (bukan disembunyikan) dengan ajakan upgrade.

- **Setting**: tabel `pengaturan_trial` (id=1) — `trial_maks_anak` (batas anak), **`trial_komunitas`** (toggle global akses Komunitas), + kolom **`boleh_trial`** per item di `kelas_bermain`/`tema`/`video` (default `true` = boleh).
- **Panel admin terpusat**: `/admin/pengaturan-trial` — batas anak + toggle **Komunitas** + daftar semua Materi Kelas / Tema (game) / Video dengan tombol **Trial ✓/✗**. Toggle sama juga ada di halaman kontennya (Kelas Bermain admin, Dashboard/Tema, Video admin).
- **Actions**: `simpanPengaturanTrial` (`admin-bisnis.ts`); `setBolehTrialKelas` (`kelas-bermain-actions.ts`, + `updateTag('katalog')`), `setBolehTrialTema`/`setBolehTrialVideo` (`admin-konten.ts`).
- **Komponen kunci**: `components/Terkunci.tsx` (🔒 + tombol Upgrade → `/pengaturan`).
- **Enforcement** (untuk user non-aktif):
  - `main/[anakId]` + `MenuAnak.tsx`: kelas/tema/video terkunci tampil 🔒 → klik = layar Terkunci; deep-link `?paket=` ke game terkunci tak auto-start.
  - `VideoPojok.tsx`: video terkunci 🔒 → `onTerkunci`.
  - `ortu/[anakId]`: kartu kelas/video terkunci → placeholder 🔒 + tombol Upgrade.
  - `pilih-game` + `PilihGame.tsx`: game terkunci 🔒 → `/pengaturan`.
  - `kelas/[id]`: item terkunci → halaman `<Terkunci>`.
  - **Komunitas**: `/komunitas` & `/komunitas/[postId]` → `<Terkunci>` bila `!trial_komunitas` (toggle global).
  - **Batas jumlah anak**: ditegakkan di `pilih-anak/actions.ts` (`tambahAnak`) **dan** `POST /api/anak` (mobile) — hitung `count anak` vs `trial_maks_anak`.
- **User aktif (berlangganan)**: bebas, tanpa gembok.

---

## 7½. Catatan Tumbuh Kembang per Event (Area/Indikator/Nilai)

Penilaian perkembangan anak per event offline. **Parameter (Area + Indikator) ditetapkan admin per event** (dibagikan semua anak; antar-event bisa beda). **Educator & admin** memberi **Nilai** (skala BB/MB/BSH/BSB) per anak + catatan. Customer melihat **tabel Area | Indikator | Nilai**.

- **Data**: `event.indikator_perkembangan jsonb` (array `{area, indikator}` — parameter event) + `catatan_perkembangan.penilaian jsonb` (snapshot `{area, indikator, nilai}` per anak). Kolom lama `aspek` dipertahankan (fallback). RLS `catatan_perkembangan` insert/update: `is_guru() OR is_admin()`.
- **Tipe**: `BarisParam {area,indikator}`, `BarisNilai extends BarisParam {nilai}` (`tipe.ts`).
- **Admin tetapkan parameter**: `/admin/event/[id]/pendaftar` → `ParameterPerkembanganForm.tsx` (baris Area + **Indikator (textarea)** + tombol "+ baris") + **Duplikat parameter dari event lain** (`getEventBerParameter`). Actions `simpanParameterPerkembangan` / `duplikatParameterPerkembangan` (mengembalikan params disalin) (`admin-event-actions.ts`).
- **Beri nilai per anak** (`NilaiPerkembanganForm.tsx`, dipakai educator & admin): render parameter event (read-only) + pill Nilai (`SKALA_PAUD`) + catatan → `simpanCatatan` (`guru-actions.ts`, guard guru|admin; snapshot ke `penilaian`).
  - Educator: `/guru/[eventId]` (`GuruNilai.tsx`). Admin: di panel pendaftar (per anak, collapsible).
- **Customer**: `CatatanCard.tsx` render **tabel** dari `penilaian` (fallback `aspek` lama) + catatan; tampil di `/catatan/[eventId]` & `/anak/[anakId]/laporan`.
- **Reader**: `getPesertaEvent` (`guru.ts`) + `catatan.ts`/`/api/anak/[id]/catatan` select `penilaian`.

---

## 8. Halaman Publik & Ortu — per halaman

### `/` Landing
- **File**: `app/page.tsx` (statis) + `Logo.tsx`. Konten hardcoded + JSON-LD SEO. **Tanpa backend.**

### `(legal)` — `/kebijakan-privasi`, `/kontak`, `/syarat-ketentuan`, `/tentang`
- **File**: `app/(legal)/*/page.tsx` + `(legal)/gaya.ts` + `@/lib/profil` (PROFIL/WA_LINK). Statis, **tanpa backend**.

### 📰 Artikel — `/artikel` & `/artikel/[slug]`
- **Fungsi data**: `getArtikelTerbit({q})`, `getArtikelBySlug(slug)` (`artikel.ts`). Detail punya `generateMetadata` + JSON-LD BlogPosting; isi via `ArtikelBody.tsx`.
- **Endpoint**: `auth.getUser()` (status login header), `artikel`.

### 🛒 Store — `/store` & `/store/[id]`
- **File**: `StoreView.tsx` (filter **kategori** + **pencarian nama** live) / `ProdukDetail.tsx` + `RekamAktivitas`, `BottomNav`, `TambahKeranjangBtn`/`ProdukCard`.
- **Fungsi data**: `getProdukTampilCached()` (`publik.ts`, tag `katalog`) / `getProduk(id)` (`store.ts`); `getStatusLangganan()` (harga diskon trial/langganan).
- **Info produk**: kartu & detail tampil **"N terjual · sisa stok"** (kolom `produk.terjual` & `stok`).
- **Server action**: `tambahKeranjang` (`keranjang-actions.ts`), `catatAktivitas`.
- **Endpoint**: `produk`, `langganan`, `keranjang_item`, `aktivitas`.
- Catatan: stok berkurang & `terjual` bertambah **idempoten** saat admin verifikasi pesanan (`potongStokPesanan`, flag `pesanan.stok_terpotong`) + `updateTag('katalog')`; `checkout` mencegah pesanan dobel (deteksi pesanan identik < 10 mnt).

### 🗓️ Event — `/event` & `/event/[id]/daftar`
- **Fungsi data**: `getEventTampilCached()` (`publik.ts`), `getStatusPendaftaranSaya()`/`getPesertaPerEvent()`/`getEvent(id)` (`event.ts`), `getEventBerCatatan()` (`catatan.ts`); daftar: `getStatusLangganan()`, `getPengaturanBayar()` + `waUntuk(cfg,'event')`.
- **Server action**: `daftarEvent(eventId, anakIds, buktiUrl, kelas?, jumlahPendamping?)` (`event-actions.ts`, **return `{ok,error}`** — pesan validasi tampil jelas di production); upload bukti via `DaftarForm.tsx`. Bila event punya kelas terpisah, `DaftarForm` menampilkan **radio Baby/Toddler Class** (dengan tgl+jam); pilihan disimpan ke `pendaftaran_event.kelas` + snapshot `kelas_jadwal`. Event gabungan → `kelas='gabungan'`. Bila `harga_pendamping>0`, tampil stepper **Tambah pendamping** → `pendaftaran_event.jumlah_pendamping`; **total = anak×harga + pendamping×harga_pendamping** (dihitung ulang di server). Kartu **💳 Pembayaran** menampilkan `bank_teks` + QRIS (`pengaturan_pembayaran`).
> **⚠️ "tanpa bukti" di halaman Pendaftar — kapan itu wajar dan kapan itu bug.** Label `tanpa bukti` muncul saat `pendaftaran_event.bukti_url` kosong. Tiga sebabnya berbeda:
> 1. **Wajar** — event/pendaftaran yang memang **gratis** (`total = 0`, termasuk yang jadi nol karena diskon member atau voucher). Tidak ada yang perlu dibuktikan.
> 2. **Bug, sudah diperbaiki** — pemeriksaan "Unggah bukti pembayaran dulu" dulu **hanya ada di klien** (`DaftarForm`), sementara `daftarEvent` tidak memeriksanya sama sekali. Pendaftaran berbayar bisa masuk tanpa bukti dan admin tak punya apa pun untuk diverifikasi. Kini **server yang menegakkan**: `total > 0 && !buktiUrl` → ditolak. Patokannya **`total`**, bukan `harga_per_anak`, supaya orang tua yang tagihannya nol karena diskon/voucher tidak diminta bukti yang tak ada.
> 3. **Bug, sudah diperbaiki** — `POST /api/events/[id]/daftar` (jalur aplikasi mobile) menerima `bukti_url` sebagai **opsional**. Sekarang wajib bila `total > 0`; alur yang memang didokumentasikan di `API-MOBILE.md` (unggah ke Storage dulu → kirim URL) tidak terpengaruh.
>
> **Yang BELUM disamakan di jalur API mobile** (sengaja, butuh keputusan pemilik): endpoint itu menghitung `total = harga_per_anak × jumlah anak` saja — **tanpa** diskon member, pendamping, voucher, dan **tanpa** cek kuota, pilihan kelas, atau pencegahan daftar ganda yang semuanya sudah ada di `daftarEvent`. Selama aplikasi mobile belum dipakai untuk transaksi nyata, dampaknya nol; begitu dipakai, angkanya bisa berbeda dari web. Perbaikan yang benar: pisahkan inti pendaftaran menjadi `event-daftar-core.ts` yang menerima client + userId, lalu dipakai kedua jalur — **pola yang sudah ada di repo ini** pada `skor-core.ts` ↔ `skor.ts`.

- **Wajib centang anak**: tombol Daftar **nonaktif** selama belum ada anak dicentang (label "Pilih anak dulu…"; kartu anak disorot merah bila dipaksa) — pendamping tidak bisa didaftarkan sendiri; server tetap menolak `anakIds` kosong.
- **Alasan penolakan**: bila status terakhir `ditolak`, kartu event ortu menampilkan **"Alasan: …"** (`getPendaftaranSaya().alasanMap` → prop `alasanTolak` di `EventCarousel`/`EventCard`) + tombol "Daftar lagi".
- **Endpoint**: `event`, `pendaftaran_event` (+ `kelas`/`kelas_jadwal`/`jumlah_pendamping`/`alasan_tolak`), `anak`, `catatan_perkembangan`, `langganan`, `pengaturan_pembayaran`, `storage.from('aset')`.

### 💬 Komunitas — `/komunitas` & `/komunitas/[postId]`
- **Fungsi data**: `getFeed()`, `getTopikOptions()`, `getPostingan(id)` (`komunitas.ts`); `getStatusLangganan()` + `getPengaturanTrial()` untuk gating.
- **Server action**: `buatPostingan`, `toggleSuka`, `lapor`, `buatKomentar` (`komunitas-actions.ts`).
- **Endpoint**: `postingan`, `komentar`, `suka`, `laporan`, `profiles`, `kelas_bermain`/`event`/`paket_aset` (opsi topik), `aktivitas`, `pengaturan_trial`.
- **Gating trial**: user non-aktif → `<Terkunci>` bila `pengaturan_trial.trial_komunitas = false` (lihat §7).

### 🎈 Kelas — `/kelas/[id]`, `/kelas-saya`, `/favorit`
- **Fungsi data**: query inline `kelas_bermain` + `rekamRiwayat` (`riwayat-kelas.ts`); `getEventDiikuti()` (`event.ts`), `getRiwayatKelas()` (`riwayat-kelas.ts`); `getFavoritKelas()` (`favorit.ts`).
- **Server action**: `toggleFavorit` (`favorit-actions.ts`), `catatAktivitas`.
- **Endpoint**: `kelas_bermain`, `riwayat_kelas`, `pendaftaran_event`, `catatan_perkembangan`, `favorit`, `aktivitas`.
- **Gating trial**: `/kelas/[id]` untuk user non-aktif → `<Terkunci>` bila `kelas.boleh_trial === false` (lihat §7).

### 🛒 Keranjang & Pesanan — `/keranjang`, `/pesanan`, `/pesanan/[id]`
- **Fungsi data**: `getKeranjang()` (`keranjang.ts`), `getPesananSaya()`/`getPesanan(id)` (`pesanan.ts`), `getStatusLangganan()`, `getPengaturanBayar()` + `waUntuk(cfg,'store')`.
- **Server action**: `setQtyKeranjang`, `hapusKeranjang`, `checkout` (`keranjang-actions.ts`); `uploadBuktiPesanan` (`pesanan-actions.ts`, via `BuktiUpload.tsx`).
- **Endpoint**: `keranjang_item`, `produk`, `pesanan`, `item_pesanan`, `profiles`, `langganan`, `pengaturan_pembayaran`, `storage.from('aset')`.

### 🔐 Auth — `/login`, `/daftar`, `/lupa-sandi`, `/reset-sandi`
- **File**: client component penuh + `Logo.tsx`. Memakai Supabase client-side.
- **Endpoint**: `auth.signInWithPassword` / `signUp` / `resetPasswordForEmail` / `updateUser` / `signOut`; `profiles` (cek `is_guru` untuk arahkan; update nama/no_wa saat daftar).
- **`components/InputSandi.tsx`** — input kata sandi dengan **tombol mata** (lihat/sembunyikan), ikon SVG inline (bukan emoji, agar konsisten lintas perangkat). Menerima semua prop `<input>` kecuali `type`. Detail yang penting: tombolnya **`type="button"`** — tanpa itu ia ikut men-submit form; input diberi `paddingRight` agar teks tidak tertimpa ikon; `aria-label`/`aria-pressed` berganti sesuai keadaan. **Terpasang di `/login`**; `/daftar`, `/reset-sandi` (2 field), dan `/pengaturan` (AkunForm) masih memakai `<input type="password">` biasa dan bisa memakai komponen yang sama bila diminta.

### 👶 Ortu & Anak — `/pilih-anak`, `/anak/[anakId]`, `/ortu/[anakId]`, `/pengaturan`
- **Fungsi data**: `getEventTampilCached()`, `getStatusPendaftaranSaya()`, `getArtikelTerbit({limit:3})`, `getPengaturanBayar()`; sisanya inline.
- **Server action**: `tambahAnak` (`pilih-anak/actions.ts`), `updateAnak`/`setBatas`/`hapusAnak`/`simpanProfilPengiriman`/`setPin` (`ortu-actions.ts`), `setNamaTampilan` (`komunitas-actions.ts`), `kirimFeedback` (`feedback-actions.ts`).
- **Nama panggilan** (0071): form Tambah Data Anak & Kelola Anak (`KelolaAnak.tsx`) punya input `nama_panggilan` (opsional) — dipakai a.l. **stiker event** (fallback: kata pertama nama lengkap).
- **🎟️ Sisa kuota tampil di kartu anak** (`/pilih-anak`): satu baris konsultasi + satu baris worksheet, supaya orang tua tak perlu masuk ke halaman konsultasi/materi hanya untuk tahu sisa haknya.
  - **⚠️ Dua angka itu CAKUPANNYA BERBEDA, dan itu ditulis di layar.** Kuota **konsultasi gratis milik ANAK** (dari paket anak itu), sedangkan **kuota unduh worksheet milik AKUN** — dihitung per `ortu_id` dan haknya dari **paket tertinggi** di akun (`getStatusWorksheet`), jadi satu kolam dipakai bersama semua anak. Menampilkannya seolah milik satu anak akan membuat orang tua mengira punya "3 unduhan × jumlah anak"; karena itu barisnya diberi keterangan **"kuota akun, dipakai bersama"**.
  - **⚠️ Arti angka 0 berbeda antara keduanya** — jebakan yang paling mudah tertukar: `worksheet_kuota_jumlah = 0` berarti **TANPA BATAS**, sedangkan `konsultasi_gratis_jumlah = 0` berarti **TIDAK ADA kuota gratis** (sesinya berbayar). Yang mengikat adalah RPC `daftar_konsultasi` (`if v_kuota > 0 then …`); `lib/domain/kuota-konsultasi.ts` (murni, 6 tes) menirunya beserta `labelKuotaKonsultasi()` untuk teksnya.
  - **Satu pembaca untuk dua tempat**: `lib/data/kuota-anak.ts` (`getKuotaAnakSaya`) dipakai kartu anak **dan** pratinjau biaya di form booking konsultasi. Perhitungan kuota sempat digandakan di `konsultasi-tarif.ts`, dan dua salinan aturan kuota adalah jalan tercepat menuju angka yang berbeda di dua halaman.
  - Keanggotaan dinilai dengan aturan yang sama seperti RPC (`aktif_sampai >= hari ini` WIB + paket ada, **tanpa** tenggang/trial), dan kolom `dari_kuota` dibaca toleran (0092 belum jalan → dianggap belum terpakai, kartunya tetap hidup).
- **Endpoint**: `anak` (+`nama_panggilan`), `langganan`, `profiles`, `hasil_main`, `event`, `pendaftaran_event`, `artikel`, `feedback`, `aktivitas`.

#### 📊 Laporan perkembangan anak — `/anak/[anakId]/laporan`
- **File**: `anak/[anakId]/laporan/page.tsx` (guard login + kepemilikan anak).
- **Badan laporan**: **`<LaporanAnakView anakId>`** (`components/`) — dipakai bersama sisi psikolog. Berisi statistik main, lencana & streak, latihan per area, waktu per game, dan blok **KEGIATAN (EVENT)** (gabungan `getCatatanAnak` + `getSertifikatAnak` per event, `<CatatanCard>`). Data: `hasil_main` + `laporanAnak()` (`domain/laporan-anak`) + `getGamifikasiAnak()`.
- **🧠 Konsultasi Psikolog**: `getKonsultasiAnak(anakId)` (`konsultasi.ts`) → **`<RiwayatKonsultasi>`** — daftar konsultasi **di-group per tanggal** (collapsible). Klik konsultasi → `/konsultasi/[id]` (riwayat chat + rekomendasi psikolog + rekomendasi produk/event/materi khusus sesi itu).
- **🎁 Rekomendasi dari Kelas/Guru**: rekomendasi tanpa sesi konsultasi (`pendaftaran_id` null, mis. diberi guru saat kelas) → `<RekomendasiCard>` + `<RekomendasiItemList>` (hanya tampil bila ada).
- **Endpoint**: `anak`, `hasil_main`, `catatan_perkembangan`, `sertifikat`, gamifikasi (`lencana_anak`/`tantangan_kustom*`), `pendaftaran_konsultasi`, `rekomendasi_psikolog`, `rekomendasi_item`.

### 🎮 Game — `/pilih-game/[anakId]`, `/main/[anakId]`
- **Guard**: `getAnakTerjamin(anakId)` (`anak.ts`) — **login + kepemilikan saja** (RLS yang menegakkan kepemilikan). **Bukan** gerbang langganan; lihat peringatan di bawah.

> **⚠️ Bug major "klik profil anak tidak membuka halaman anak" & perbaikannya.** `getAnakTerjamin` dulu me-`redirect('/pilih-anak')` **diam-diam** begitu `bolehAkses(status)` false. Efeknya: sekali masa trial ortu habis, mengetuk kartu anak di `/pilih-anak` terasa seperti tombol rusak — layar hanya kembali ke halaman yang sama, tanpa satu pun pesan. Dua hal yang membuatnya layak disebut bug, bukan paywall:
> 1. **Kunci per konten yang sudah dibangun jadi mustahil tampil.** `/main`, `/ortu`, `/pilih-game` semuanya menghitung `batasi = dibatasiTrial(status)` (= `status !== 'aktif'`, jadi **termasuk `kadaluarsa`**) untuk memberi 🔒 pada item non-trial. Selama gerbang ini ada, cabang `kadaluarsa` itu **dead code** — user dipantulkan sebelum melihatnya.
> 2. **Gerbangnya menyala karena sebab yang bukan kedaluwarsa.** `langganan` dibaca dengan `.single()`; baris yang **hilang** (user lama / trigger `0001` gagal) atau **ganda** membuatnya error → `lang` null → status dipaksa `'kadaluarsa'` → ortu terkunci dari anaknya sendiri tanpa sebab.
>
> **Perbaikan** (keputusan pemilik: *tetap boleh masuk, konten dikunci*): pemeriksaan langganan dicabut dari guard — status kini hanya menentukan 🔒 per item, seperti yang memang sudah dirancang. Query anak memakai `maybeSingle()`, dan satu-satunya pantulan tersisa membawa alasan (`/pilih-anak?galat=anak-tidak-ditemukan`) yang **ditampilkan** sebagai spanduk. **Aturan umum yang lahir dari sini: jangan pernah `redirect()` tanpa membawa alasan yang bisa dibaca pengguna** — pantulan diam ke halaman asal tak bisa dibedakan dari tombol rusak.
>
> Pantulan diam kedua di jalur yang sama juga dihapus: `/main` dulu `redirect('/pilih-anak')` bila `getPustaka()` kosong. Mode Anak tetap berguna tanpa game (Ide Bermain, Pojok Video, koin & lencana), dan `MenuAnak` sudah punya keadaan kosong **"Belum ada game"** yang selama ini tak pernah bisa tampil.

- **Fungsi data**: `getPustaka()` (`pustaka.ts`), `getVideoByKategori()` (`video.ts`), `getKelasAktifCached()` (`publik.ts`), `getFavoritIds()` (`favorit.ts`), `getGamifikasiAnak()` (`gamifikasi.ts`), `getStatusSaya()`/`getStatusLangganan()` (`langganan-status.ts`).
- **Server action**: `catatHasil` (`skor.ts`) via `GameRunner`, `catatRiwayatKelas` (`riwayat-actions.ts`), `catatAktivitas`.
- **Endpoint**: `anak`, `langganan`, `tema`, `paket_aset`, `video`, `kelas_bermain`, `favorit`, `hasil_main`, `lencana_anak`, `tantangan_kustom`(+`_anak`), `tantangan_anak`, `profiles` (pin), `riwayat_kelas`, `aktivitas`.
- **Gating trial**: `MenuAnak`/`PilihGame`/`VideoPojok` menerima flag `batasi`; item `boleh_trial === false` tampil **🔒** dan diklik → `<Terkunci>`/`/pengaturan`. `MenuAnak.tsx` juga cegah deep-link (`?paket=`) auto-start game terkunci. `/ortu/[anakId]` sama (kartu 🔒). Lihat §7.
- **Catatan mesin game** (`components/game/`): **Hitung-Kode** (`HitungGame.tsx`) mendukung operasi **+ − × ÷** (`OperasiHitung`; disimpan `'x'`/`':'`, ditampilkan × ÷; validasi `validasiButir`: ÷ wajib kanan ≠ 0 & kiri habis dibagi kanan, − wajib kiri ≥ kanan); pilihan operasi di form admin `PaketForm.tsx`. **Eja Kata** (`EjaKataGame.tsx`): huruf di slot **disembunyikan** — hanya huruf pertama tampil sebagai 1 petunjuk, anak mencari urutan sendiri dari tumpukan huruf.
- **Mesin CALISTUNG** (spec `docs/superpowers/specs/2026-07-17-game-calistung-design.md`; tanpa migrasi DB; semua soal ber-`audio_url?` — TTS `bunyikan()` di `lib/tts.ts`, rekaman override bila diisi):
  - 📖 **`sukukata`** (`SukuKataGame.tsx`, kognitif) — mode `susun` (gambar+suara → susun suku kata jadi kata) & `dengar` (fonik: dengar → pilih). Validasi: `sukuKata.join('')===kata`, susun ≥2 suku, dengar ≥1 pengecoh.
  - ✍️ **`jiplak`** (`JiplakGame.tsx`, motorik-halus) — tracing goresan karakter; jalur bawaan `lib/game/jiplak-path.ts` (`JALUR_KARAKTER` A–Z a–z 0–9, viewBox 100×140, `rapatkan()` utk deteksi progres); toleransi longgar, keluar-jalur ≤3 = rapi. Admin cukup ketik daftar karakter.
  - 🔢 **`hitung-benda`** (`HitungBendaGame.tsx`, kognitif) — mode `hitung` (tap benda satu-satu + TTS hitungan → pilih angka) & `banyak-mana` (bandingkan 2 kelompok). Validasi jumlah 1–10, banyak-mana wajib kelompok-2 & jumlah beda.
- **Mesin MEMORY**: 🧠 **`ingatan`** (`IngatanGame.tsx`, kognitif; **butuh migrasi CHECK `0080_mesin_ingatan.sql`**) — memory/concentration: kartu **tertutup**, buka 2 → cocok tetap terbuka, beda tertutup lagi (working memory; beda dari `cari-pasangan` yang kartunya selalu terlihat). **Model pasangan EKSPLISIT** `DataIngatan { pasangan: (PasanganIngatan|string)[] }`, `PasanganIngatan { a; b? }` — 1 baris form = 1 pasangan: Kartu 1 (`a`) wajib, Kartu 2 (`b`) opsional (kosong → `b`=`a`, satu gambar jadi 2 kartu; isi 2 gambar beda utk pasangan induk↔anak). Tiap pasangan → 2 kartu berbagi **id**; **cocok murni by id** (tak bergantung nilai gambar → aman utk 2 upload gambar sama ber-URL beda). Dek teracak tiap "main lagi" (remount GameRunner), grid kolom adaptif, tanpa batas maksimal (min 2 pasangan). Klik hanya append via functional updater; evaluasi cocok di `useEffect` saat 2 kartu terbuka (bebas race klik cepat/double-tap). Data lama `string[]` dibaca sbg self-pair (backward-compat).
  - **⏱️ Timing (perbaikan dari keluhan pengguna: "kartu 1 lama terbuka, kartu 2 cepat hilang")** — akarnya SATU: gambar baru diunduh **saat kartu dibalik** (`<img loading="lazy"` yang baru ada di DOM ketika terbuka), sehingga kartu pertama menunggu jaringan dan kartu kedua tertutup sebelum sempat tampil karena timer sudah jalan sejak dibalik. Perbaikan: (1) **pramuat + `decode()` semua gambar saat mount** sebelum kartu boleh dibuka — header menampilkan `⏳ Menyiapkan kartu… n/m`, grid diredupkan & tombol nonaktif, ada batas tunggu `BATAS_PRELOAD_MS` 5 dtk agar jaringan lambat tidak menggantung permainan (`onerror` juga dihitung, gambar rusak tak memblokir); (2) jeda tutup pasangan tak cocok `JEDA_TUTUP_MS` **900ms → 1800ms**; (3) `Aset` menerima prop **`segera`** (`loading="eager"` + `decoding="sync"`) yang dipakai kartu terbuka; (4) jeda itu jadi **batas ATAS** — mengetuk kartu lain saat menunggu langsung menutup pasangan lama & membuka kartu baru (cleanup `useEffect` membatalkan timer), jadi anak yang sudah ingat tidak dipaksa menunggu.

### 🧠 Kelola Psikolog — `/admin/psikolog`
- **File**: `admin/psikolog/page.tsx` + client `PsikologAdmin.tsx`.
- **Dua hal berbeda di satu halaman**: (1) **akses** — `jadikanPsikolog(email)` / `cabutPsikolog(id)` menyalakan `profiles.is_psikolog`; (2) **master profil** — `simpanProfilPsikolog()` upsert ke tabel **`psikolog_profil`** (migrasi **0087**).
- **Field master**: `nama` (termasuk gelar), `badge`, `spesialisasi`, `foto_url`, `pendidikan_s1`, `pendidikan_profesi`, `no_str`, `pengalaman`, `urutan`, `aktif`. Foto diunggah client-side (`kompresGambar` 640/0.82 → `aset/psikolog/`).
- **Jadwal & durasi sesi TIDAK diatur di sini** — itu diisi psikolog sendiri di `/psikolog/jadwal` (`jadwal_psikolog`). Pembagian ini disengaja dan dinyatakan di UI admin.
- **Kenapa tabel terpisah, bukan kolom di `profiles`**: customer **tidak boleh membaca `profiles` milik psikolog** (sebab itulah `nama` didenormalisasi ke `jadwal_psikolog` sejak 0065). Data profesional yang memang untuk ditampilkan ke customer harus tinggal di tabel yang boleh dibaca customer.
- **RLS `psikolog_profil`**: baca = semua `authenticated`; tulis = **admin saja**. `no_str` adalah data kredensial — psikolog sengaja TIDAK diberi hak ubah sendiri agar tidak bisa mengklaim nomor registrasi yang bukan miliknya.
- **Akses toleran** (`lib/data/psikolog-profil.ts`): bila tabel belum ada (migrasi 0087 belum dijalankan), reader mengembalikan peta kosong → halaman konsultasi tetap jalan dengan nama dari `jadwal_psikolog`, hanya tanpa kartu profil. Action memberi pesan spesifik "jalankan migrasi 0087" bila kena `42P01`.
- Menyimpan profil juga **menyinkronkan `jadwal_psikolog.nama`** agar nama di daftar & chat konsisten.

### 🍎 Guru — `/guru`, `/guru/[eventId]` (isi Nilai tumbuh kembang), `/catatan/[eventId]`
- **Guard**: `getGuruTerjamin()` (`guru.ts`).
- **Fungsi data**: `getEventUntukGuru()`, `getPesertaEvent(eventId)` (`guru.ts`), `getEvent()`/`getCatatanEventSaya()` (`event.ts`/`catatan.ts`).
- **Server action**: `simpanCatatan` (`guru-actions.ts`, upsert) — di-gate izin fitur **`nilai`** (form disembunyikan bila off; `pengisi()` menolak di server).
- **Rekomendasi item**: `GuruNilai.tsx` juga menampilkan `<RekomendasiItemPicker>` per peserta (produk/event/materi, izin via Akses Fitur `fiturUntukRole({is_guru,is_admin})`).
- **Cari nama anak** (`GuruNilai.tsx`): kotak pencarian di atas daftar peserta, cocok substring case-insensitive pada nama anak; menampilkan `N dari M anak cocok` + tautan "tampilkan semua", dan pesan khusus bila tak ada yang cocok. **Filternya menyembunyikan kartu (`display:none`), BUKAN meng-unmount** — tiap kartu memuat `NilaiPerkembanganForm` dengan state sendiri, jadi unmount akan membuang penilaian/catatan yang sudah diketik guru tapi belum ditekan Simpan. Ikuti pola ini untuk filter apa pun di atas daftar yang berisi form belum tersimpan.
- **Endpoint**: `profiles`, `event`, `pendaftaran_event`, `catatan_perkembangan`, `rekomendasi_item`, katalog `produk`/`kelas_bermain`.

### 🧠 Psikolog — `/psikolog`, `/psikolog/jadwal`, `/psikolog/[pendaftaranId]`
Area kerja psikolog (self-guarded, pola seperti `/guru`). Role `is_psikolog` (0064).
- **Guard**: `getPsikologTerjamin()` (`psikolog.ts`).
- **Beranda** `/psikolog`: `getSesiPsikolog()` (pendaftaran `menunggu` + sesi `diterima`) + `getJadwalSaya()`; tombol Terima/Tolak/Selesai (`SesiActions.tsx` → `setStatusKonsultasi`).
- **Jadwal** `/psikolog/jadwal`: `JadwalForm.tsx` → `simpanJadwal` (hari buka, jam, `maks_per_hari`, **`durasi_menit`** per sesi — 0 = tanpa batas, aktif). Denormalisasi `nama` psikolog ke `jadwal_psikolog` (customer tak boleh baca `profiles` psikolog).
- **Chat** `/psikolog/[pendaftaranId]`: tombol **✅ Selesaikan konsultasi** (bila status `diterima`, `SesiActions` → `setStatusKonsultasi('selesai')`); `<ChatKonsultasi>` (polling 3 dtk, **nonaktif bila status ≠ diterima atau izin fitur `chat` off**) + `<LaporanAnakView>` (akses via RLS `boleh_lihat_laporan_anak`) + `<RekomendasiForm>`/`<RekomendasiCard>` + **`<RekomendasiItemPicker>`** (gate `fiturUntukRole({is_psikolog,is_admin})`).
- **Durasi & timer sesi** (0072): bila `durasi_menit>0` dan sesi belum dimulai, tampil **▶ Mulai Konsultasi** (`MulaiKonsultasiBtn.tsx` → `mulaiKonsultasi` — set `dimulai_pada` + snapshot `durasi_menit` di pendaftaran). `<ChatKonsultasi>` menampilkan **hitung mundur ⏳** (sinkron di sisi psikolog & ortu); ≤1 menit terakhir bar merah **⚠️ 1 menit terakhir!**; waktu habis → `selesaikanKonsultasi` (idempoten, `konsultasi-actions.ts`) → status `selesai`, chat nonaktif otomatis.
- **Endpoint**: `profiles`, `jadwal_psikolog`, `pendaftaran_konsultasi`, `pesan_konsultasi`, `rekomendasi_psikolog`, `rekomendasi_item`, + tabel laporan (`anak`/`hasil_main`/`sertifikat`/gamifikasi/`catatan_perkembangan`).

**Rekomendasi item (produk/event/materi)** — dipakai psikolog & guru (izin via Akses Fitur):
- **Katalog & data**: `getKatalogRekomendasi()` (produk tampil/event tampil/`kelas_bermain` aktif), `getRekomendasiItemAnak()`, `getRekomendasiItemByAnakIds()` (`rekomendasi-item.ts`).
- **Server action**: `tambahRekomendasiItem`/`hapusRekomendasiItem` (`rekomendasi-item-actions.ts`, guard psikolog/guru + cek `getFiturAkses`).
- **Komponen**: `<RekomendasiItemPicker>` (list + filter search, per jenis), `<RekomendasiItemList>` (tombol Beli→`/store`, Ikut→`/event/[id]/daftar`, Buka→`/kelas`), `<HapusItemBtn>`.
- **Tampil ke ortu**: `/anak/[id]/laporan` & `/konsultasi/[id]` (bagian "Rekomendasi Produk/Event/Materi").

### 💳 Konsultasi Bayar-Per-Sesi (migrasi 0092)
- **Gerbang "khusus member aktif" DICABUT** dari `/konsultasi` — inilah permintaan yang memicu fitur ini: orang tua non-member pun bisa berkonsultasi. Yang membedakan member: **diskon** atau **kuota gratis** dari paket anaknya.
- **Tarif diisi ADMIN, bukan psikolog** (permintaan pemilik). Kolomnya tetap `jadwal_psikolog.harga_konsultasi` + `diskon_langganan_persen` karena RPC booking membacanya, tapi **satu-satunya penulisnya** adalah `setTarifKonsultasi` di `/admin/psikolog`. `simpanJadwal` milik psikolog sengaja **tidak menyebut** kolom itu, sehingga tarif yang diisi admin tak tertimpa saat psikolog mengubah jadwalnya; halaman Jadwal psikolog hanya **menampilkan** tarifnya. Cadangan bila tarif 0: `pengaturan_pembayaran.harga_konsultasi_nominal`; diskon member cadangan `diskon_konsultasi_langganan_persen` (bawaan **100** = member tidak ditagih). Keduanya diatur di `/admin/pengaturan-bayar`.
- `setTarifKonsultasi` memakai **upsert**: baris jadwal bisa belum ada bila psikolognya belum mengatur jadwal. Baris yang terbentuk hanya berisi tarif — `hari_buka` masih kosong, jadi belum bisa dibooking sampai psikolognya membuka jadwalnya sendiri (ditandai di UI admin).
> **⚠️ Kuota konsultasi hanya berarti bila diskon member < 100%.** Kuota dihitung **per ANAK** dengan paketnya sendiri, jadi kuota kakak yang habis TIDAK memengaruhi adiknya — itu memang perilaku yang diinginkan. Tapi kuota yang habis **tidak memblokir booking**: sesinya jatuh ke jalur berbayar dengan diskon member. Bila diskon member 100% (nilai bawaan), sesi setelah kuota habis **tetap gratis** — jadi kuotanya tak pernah menahan apa pun. Pertentangan ini sekarang **diperingatkan di UI**: kartu paket di `/admin/paket` menampilkan peringatan bila `konsultasi_gratis_jumlah > 0` sementara diskon member masih 100%, dan field diskonnya di `/admin/pengaturan-bayar` menjelaskan bahwa ia berlaku untuk sesi **setelah** kuota habis.

- **Kuota gratis dari paket**: `paket_langganan.konsultasi_gratis_jumlah` + `_satuan` (kolomnya sudah ada sejak 0089, **baru berfungsi di 0092**). Sesi yang memakai kuota ditandai `pendaftaran_konsultasi.dari_kuota` dan bertotal 0. Kuota dihitung dari **paket ANAK yang dibooking-kan** — booking selalu untuk satu anak, jadi tak perlu aturan "paket tertinggi" di sini.
- **Alur**: ortu booking → psikolog **Konfirmasi jadwal** → total 0 (member diskon 100% / dari kuota) langsung `diterima`; total > 0 jadi **`menunggu_bayar`** + `batas_bayar` 24 jam → ortu unggah bukti → admin **verifikasi** di `/admin/psikolog` → `diterima`, chat terbuka, `catatLedger(kategori 'konsultasi')`. Tolak → ledger dihapus & kuota voucher dilepas.
- **Kuota harian psikolog** kini menghitung `menunggu_bayar` yang belum kedaluwarsa (`sisa_kuota_konsultasi` diperbarui), supaya tagihan yang tak dibayar tidak menyandera slot selamanya. **Tidak ada cron**: kedaluwarsa dihitung saat dibaca.

> **⚠️ Uang dihitung DI DALAM RPC, bukan dikirim klien.** Policy 0065 mengizinkan ortu meng-update baris pendaftaran konsultasinya sendiri, jadi nominal yang dipercaya dari klien = konsultasi gratis bagi siapa pun yang tahu caranya. `daftar_konsultasi` (SECURITY DEFINER, signature bertambah `p_voucher`) menghitung tarif, diskon member, kuota gratis, **dan** validasi + potongan voucher seluruhnya di SQL. Klien hanya menyebut **id voucher**, bukan nominalnya.
> Konsekuensi yang disengaja: aturan voucher jadi ada di dua tempat — TypeScript untuk pratinjau UI, SQL untuk penegakan. Yang berlaku adalah **SQL**.
>
> **Trigger `cegah_ubah_konsultasi`** melengkapinya: ortu hanya boleh menyentuh `bukti_url` dan membatalkan sesinya; kolom uang, `dari_kuota`, `batas_bayar`, `dibayar_pada`, dan transisi status lain hanya untuk admin/psikolog sesi itu.
>
> **Kategori ledger baru `konsultasi`** ditambahkan ke `KATEGORI_MASUK` & `LABEL_KATEGORI` (kategori ledger berupa teks bebas, jadi tanpa migrasi). Voucher bercakupan `konsultasi` (`voucher.berlaku_konsultasi`, `voucher_redeem.ref_tipe='konsultasi'`).

### 🧠 Slot konsultasi baru terpakai SESUDAH dibayar (migrasi 0096)
**Laporan pemilik:** *"anak yang tidak langganan bisa mendaftar meskipun statusnya menunggu tapi belum bayar"*. Benar — dan bukan sekadar tampilan: booking apa pun langsung berstatus `menunggu` dan **ikut dihitung `sisa_kuota_konsultasi`**, jadi siapa pun bisa **menahan slot psikolog tanpa pernah membayar**. Keputusan pemilik: **bayar dulu baru terdaftar**; yang belum dibayar hanya **draft**.

- **Satu definisi "memakai slot"** — fungsi SQL `konsultasi_memakai_slot(status, total, bukti_url)`: status `diterima`, **atau** `menunggu`/`menunggu_bayar` yang **totalnya 0** (kuota gratis paket / diskon member 100% — memang tak ada yang perlu dibayar), **atau** yang **sudah punya bukti transfer**. Dipakai penghitung kuota **dan** trigger, jadi tak ada dua tafsir.
- **RPC `daftar_konsultasi` melahirkan sesi berbayar sebagai draft** `menunggu_bayar` + `batas_bayar = now() + 24 jam`, bukan `menunggu`. Tanpa ini "bayar dulu" mustahil: orang tua dulu harus menunggu psikolog mengonfirmasi sebelum boleh membayar.
- **Penjaga booking ganda mengabaikan draft yang sudah hangus**, supaya satu draft telantar tak mengunci orang tua dari memesan ulang tanggal yang sama.
- **Konsekuensi yang disengaja & dinyatakan di layar:** beberapa orang tua bisa punya draft di tanggal yang sama, dan **yang lebih dulu membayar mendapat slotnya**. Karena itu kuota **diperiksa ulang tepat saat sebuah baris mulai memakai slot** oleh trigger `cek_slot_konsultasi` (BEFORE INSERT/UPDATE) — termasuk bila jalurnya `PATCH` REST langsung. Tanpa trigger itu, "bayar dulu" hanya sopan santun UI, bukan aturan. Galatnya ditulis untuk dibaca orang tua ("kuota tanggal … sudah penuh… pilih tanggal lain") dan diteruskan apa adanya oleh `unggahBuktiKonsultasi`.
- **Keadaan slot dikatakan, bukan disembunyikan** — `lib/domain/konsultasi-slot.ts` (murni, 9 tes) memberi `aman` / `draft` / `hangus` / `tak-relevan`, dan halaman `/konsultasi` menampilkan **"Belum terdaftar — slot baru diamankan setelah bukti transfer diunggah"** serta **"batas waktu lewat → hangus, slot dilepas"**. Modul itu **kembaran** aturan SQL untuk keperluan label saja; **penegaknya tetap database** — kalau salah satu diubah, keduanya harus diubah bersama.
- **Kadaluwarsa dievaluasi saat dibaca** (aplikasi ini tak punya cron), dan `unggahBuktiKonsultasi` menolak unggahan setelah batas waktu — bukan hanya menyembunyikan tombolnya.
- **`setStatusKonsultasi('diterima')` tak lagi jadi pintu belakang**: sesi berbayar yang sudah ada buktinya **ditolak** dengan pesan agar diverifikasi lewat Admin → Kelola Psikolog, karena verifikasi itulah yang **mencatat pemasukan ke ledger**. Meloloskannya dari sisi psikolog akan membuat uang masuk tanpa jejak keuangan. Baris lama (dibuat sebelum 0096, berstatus `menunggu` walau berbayar) tetap bisa diminta membayar lewat tombol Terima.

> **Efek pada data yang sudah ada:** booking berbayar lama yang masih `menunggu` tanpa bukti **berhenti menahan slot** begitu 0096 dijalankan — itu memang slot yang selama ini tertahan tanpa pembayaran.

> **Koreksi 0096 → 0097.** 0096 mencabut `execute` `konsultasi_memakai_slot` hanya dari peran `anon`, dan probe pasca-migrasi menunjukkan fungsi itu **masih bisa dipanggil kunci anon** (`HTTP 200 → false`). Sebabnya ada **dua** pemberi izin — `PUBLIC` (bawaan Postgres) dan `anon` (default privileges Supabase) — dan keduanya harus dicabut; `hari_ini_wib()` kebetulan kena keduanya karena 0094 & 0095 masing-masing mencabut satu. Dampaknya nol untuk data (fungsi ini hanya menghitung boolean dari argumennya), tapi 0097 menutupnya dengan benar. **0097 juga memeriksa dirinya sendiri**: bila trigger `trg_cek_slot_konsultasi` tak ditemukan, migrasinya GAGAL BERISIK — lebih baik begitu daripada aturan "bayar dulu" bolong tanpa tanda, sebab tanpa auth saya tak bisa membuktikan keberadaan trigger dari luar.

### 🧠 Konsultasi (customer) — `/konsultasi`, `/konsultasi/[pendaftaranId]`
Sisi orang tua. **Gerbang "khusus member aktif" sudah DICABUT** (sub-proyek B): konsultasi bisa dibeli **per sesi oleh siapa pun** — itulah permintaan yang memicu fitur ini. Yang membedakan member hanyalah **diskon** atau **kuota gratis** dari paket anaknya, dan keduanya dihitung di dalam RPC booking. Sejak 0096, sesi berbayar baru **menahan slot setelah bukti transfer diunggah**.
- **Fungsi data** (`konsultasi.ts`): `getPsikologTersedia()` (dari `jadwal_psikolog` aktif), `getAnakSaya()`, `getKonsultasiSaya()`, `getKonsultasiAnak()`, `getPesan()`, `getRekomendasiAnak()`.
- **Server action** (`konsultasi-actions.ts`, dipakai ortu & psikolog): `daftarKonsultasi` (via RPC `daftar_konsultasi` — enforce hari buka + **jam dalam window jadwal** + kuota harian + cegah booking ganda), `kirimPesan` (gate izin `chat` bila pengirim psikolog), `tandaiDibaca`, `batalKonsultasi`, `selesaikanKonsultasi` (auto-selesai timer).
- **Booking dibatasi jadwal** (0073): `BookingForm.tsx` — **tanggal = dropdown hari buka saja** (30 hari ke depan dari `hari_buka`), **jam = dropdown slot** per `durasi_menit` dalam window `jam_mulai–jam_selesai` (atau input time ber-min/max bila durasi 0). Jam tersimpan di `pendaftaran_konsultasi.jam` dan divalidasi ulang di RPC (`p_jam`) — tak bisa memilih di luar jadwal psikolog.
- **`BookingForm.tsx` — UI pemilihan psikolog berbasis kartu**: pemilih psikolog dibuat **dropdown kustom** (bukan `<select>`) karena harus menampilkan **foto + badge**; lalu ringkasan jadwal, **kartu profil** (foto besar, nama+gelar, badge, spesialisasi, 🎓 S1, 🏅 profesi, ✅ STR, paragraf pengalaman yang di-clamp 3 baris + tombol "Lihat Profil Lengkap"), dan **panel kanan** berisi Jadwal Tersedia · Durasi Sesi · Konsultasi via Chat · Laporan Tersimpan.
  - **Pembagian sumber data (disengaja)**: nama/foto/pendidikan/STR/pengalaman dari master **`psikolog_profil`** (diisi admin); **Jadwal Tersedia & Durasi Sesi dari `jadwal_psikolog`** (diisi psikolog sendiri). Bila master kosong/migrasi 0087 belum jalan, kartu menyusut ke nama dari jadwal dan form tetap bisa dipakai.
  - Pilih **anak** tetap ada meski tidak tampak di mockup — `daftarKonsultasi` mewajibkannya.
- **🎟️ Input voucher di form booking + pratinjau biaya.** RPC `daftar_konsultasi` sejak 0092 sudah menerima `p_voucher` dan `voucher.berlaku_konsultasi` sudah ada di master — **yang belum ada hanya field-nya di UI**, jadi fiturnya mustahil dipakai orang tua. Sekarang `BookingForm` punya kode voucher (pola sama dengan pendaftaran event: `cekVoucher(kode, 'konsultasi', subtotal)` → simpan `voucher_id`, **kirim id-nya saja**, potongan dihitung ulang di dalam RPC).
  - **Voucher butuh konteks nominal**, jadi form ini kini juga menampilkan **rincian biaya**: tarif → diskon member → voucher → total. Bahannya `lib/data/konsultasi-tarif.ts` (`getPratinjauKonsultasi`): tarif per psikolog (nol = ikut bawaan global, meniru `nullif(...,0)` di RPC) **dan** sisa kuota gratis tiap anak. Kolom 0092 dibaca **toleran** — bila belum ada, semua jatuh ke bawaan global dan form tetap hidup.
  - **Hitungannya di `lib/domain/konsultasi-biaya.ts`** (murni, 8 tes) — **kembaran** perhitungan RPC, bukan penggantinya: kuota gratis dipakai lebih dulu → diskon member → voucher, dan voucher **tak pernah terpakai pada sesi bernilai 0** (kuota gratis atau diskon member 100%) supaya orang tua tak kehilangan vouchernya untuk sesi yang memang sudah gratis. Yang mengikat tetap SQL; ubah keduanya bersama.
  - **Keanggotaan dinilai dengan aturan yang sama seperti RPC**: `langganan_anak.aktif_sampai >= hari ini` **dan** paketnya ada — sengaja **tanpa** masa tenggang/trial, karena RPC pun tak memakainya. Kalau di sini dibuat lebih longgar, pratinjau akan menjanjikan diskon yang lalu ditolak server.
  - Hitungan kuota terpakai ditulis sebagai **daftar status POSITIF** (`in ('menunggu','menunggu_bayar','diterima','selesai')`), bukan `not.in` — tanda kutip & kurung di filter PostgREST mudah salah bentuk, dan query yang salah bentuk akan terbaca sebagai "kuota masih penuh", yakni membocorkan sesi gratis.
  - Pesan sukses pendaftaran ikut jujur: sesi berbayar berbunyi *"lanjutkan pembayaran — slot baru aman setelah bukti transfer diunggah"* (0096), bukan "menunggu persetujuan psikolog".
- **Halaman**: `/konsultasi` (`BookingForm.tsx` + **daftar sesi di-group per tanggal** collapsible, tampilkan 🕐 jam + `BatalBtn.tsx`); `/konsultasi/[id]` (chat ber-timer + rekomendasi psikolog + rekomendasi item, **difilter per `pendaftaran_id` sesi**; sesi `selesai` → read-only "Riwayat chat").
- **Endpoint**: `jadwal_psikolog`, `anak`, `pendaftaran_konsultasi`, `pesan_konsultasi`, `rekomendasi_psikolog`, `rekomendasi_item`; RPC `daftar_konsultasi`/`sisa_kuota_konsultasi`.

### 📈 Investor — `/investor`
- **Guard**: `getInvestorTerjamin()` (`investor.ts`). `robots: noindex`.
- **Fungsi data**: `getDashboardKeuangan()`, `getPerBulan(6)` (`keuangan.ts`).
- **Endpoint**: `profiles`, `transaksi_keuangan`, `langganan` (+ sumber lain via dashboard keuangan).

> **⚠️ Kenapa sebagian orang tua "tidak bisa melihat event" padahal sudah diterima & absen** (keluhan nyata) — tiga sebab berbeda, semuanya sudah ditangani/didiagnosis:
> 1. **Halaman `/event` hanya memuat katalog `status='tampil'`** (via `getEventTampilCached`, client anon agar cacheable). Begitu admin **mengarsipkan** event yang sudah selesai, kartunya hilang — padahal **tautan Catatan Perkembangan menempel di kartu itu**. Diperbaiki: `/event` kini menambahkan blok **"EVENT YANG PERNAH DIIKUTI"** dari `getEventDiikuti()` untuk event di luar katalog. Ini bekerja karena policy **`event baca peserta` (0068)** mengizinkan ortu membaca event yang pernah ia daftari walau diarsipkan.
> 2. **`sertifikat.dokumentasi_url` adalah SNAPSHOT** saat sertifikat dibuat. Bila admin memasang link dokumentasi **setelah** generate, snapshot itu `null` dan tombol dokumentasi tak pernah muncul. Diperbaiki: `getSertifikat` membaca `event.dokumentasi_url` **live**, snapshot hanya cadangan — sertifikat lama ikut benar **tanpa generate ulang**.
> 3. **Sertifikat hanya dibuat untuk anak di `hadir_anak_ids`** (`generateSertifikatEvent`). Bila admin menekan Generate **sebelum** absensi ditandai, anak yang hadir belakangan tidak dapat sertifikat. Ini **bukan bug** — cukup tekan Generate lagi (upsert idempoten). Perilaku ini disengaja: sertifikat hanya untuk yang benar-benar hadir.
>
> 4. **Rapor anak: blok KEGIATAN dulu hanya lahir dari baris `catatan_perkembangan`/`sertifikat`.** Akibatnya anak yang **sudah diabsen hadir** tapi sertifikatnya belum di-generate (atau gurunya belum menilai) **tidak melihat blok apa pun** — termasuk tautan dokumentasi. Karena admin biasanya mengarsipkan event tepat di fase itu, gejalanya tampak seperti "diarsipkan → dokumentasi & e-sertifikat hilang". Diperbaiki di `LaporanAnakView`:
>    - **`getEventIdHadirAnak(anakId)`** (`event.ts`) — id event tempat anak ada di `pendaftaran_event.hadir_anak_ids` (status `diterima`) **selalu** memunculkan bloknya, lepas dari status event. Bila sertifikatnya memang belum terbit, blok menampilkan pesan jujur "E-sertifikat belum diterbitkan admin" alih-alih menghilang diam-diam.
>    - **`getEventInfoBanyak(ids)`** (`event.ts`) — judul, tanggal, dan `dokumentasi_url` dibaca **live dari `event`** (1 query batch), snapshot sertifikat hanya cadangan bila baris event tak terbaca (mis. dilihat psikolog, yang tak tercakup policy 0068). Ini menambal sebab (2) di sisi Rapor — sebelumnya hanya halaman `/sertifikat/[id]` yang sudah live, sehingga tombol Dokumentasi muncul di detail tapi **tidak** di Rapor.
>    - Tombol **📷 Dokumentasi kini satu per event** (dulu satu per sertifikat → ganda bila satu ortu punya 2 anak di event yang sama).
>
> Jalur ke sertifikat & catatan **tidak** bergantung status event: semua sumber blok (`sertifikat`, `catatan_perkembangan`, `hadir_anak_ids`) di-query tanpa filter status, dan pembacaan `event` untuk ortu peserta dijamin policy 0068. Jadi rapor anak tetap utuh walau event diarsipkan.

### 🎓 Kurikulum bulanan, evaluasi & catatan tema (migrasi 0098–0103)

**Masalah yang diselesaikan.** Ide Bermain dulu adalah **kumpulan materi lepas**: semuanya tampil sekaligus, tak berurutan, tak dinilai siapa pun, dan tak meninggalkan jejak di rapor. Orang tua mengerjakan aktivitas di rumah lalu tak punya bukti anaknya berkembang — dan tak punya alasan menunggu bulan depan.

#### Kohort: MILIK ANAK, tanpa penggabungan

- **Jam kohort = jumlah bulan berlangganan**, disimpan sebagai penghitung `langganan_anak.bulan_kurikulum` yang **hanya naik di `setPaketAnak`** — satu-satunya tempat periode diperpanjang (admin manual **dan** verifikasi tagihan). `hentikanPaketAnak` sengaja **tidak** menurunkannya: bulan yang sudah dijalani tak hilang karena langganan berhenti.
- **Kenapa penghitung tersimpan, bukan diturunkan dari riwayat:** riwayat pembayaran per *anak* hanya ada di `tagihan_langganan_item` (0090), dan itu **tidak mencakup** aktivasi manual admin maupun member lama hasil backfill 0089. Menurunkan angkanya akan salah untuk keduanya. Backfill 0098 mengisi dari tagihan diterima (minimal 1) dan dijaga idempoten lewat `where bulan_kurikulum = 0`.
- **Kunci tema milik ANAK.** Kakak di bulan ke-3 **tidak** membuka tema itu untuk bayi yang masih bulan ke-1. Karena itu `statusTema()` di `lib/domain/kurikulum.ts` **hanya menerima `bulanAnak`** — sengaja tak ada varian tingkat akun yang bisa dipanggil keliru lalu menggabungkan kohort dua anak.
- Akibatnya **daftar tema tak bisa lagi tingkat akun**: `/kelas-saya` dan `/kelas/[id]` diberi `?anak=` + `PemilihAnak` yang **selalu terlihat**, judulnya menyebut nama anak, dan tema terkunci menyebut sebabnya ("terbuka saat langganan Bima masuk bulan ke-4"). Tanpa itu, perbedaan kakak–adik terbaca sebagai kerusakan.
- **Tema tanpa `bulan_kurikulum` dianggap TERBUKA** (materi lama / migrasi belum jalan). Default yang salah arah di sini akan mengunci konten yang tadinya jalan — dan itu terbaca sebagai fitur dicabut.
- Mode Anak **tidak** menampilkan judul bulan depan sama sekali: judul-saja adalah bahasa untuk orang tua; bagi anak ia cuma pintu yang tak bisa dibuka.

#### 🐞 Gerbang HAK Ide Bermain: tiga lubang sekaligus

Pemilik meminta dipastikan: **trial tak boleh membuka tema yang akses trialnya dimatikan**, dan bila tak berhak, yang muncul harus **ajakan berlangganan** — bukan "bulan ke-N masih tertutup", karena itu kondisi yang berbeda. Pemeriksaan menemukan tiga cacat.

**Lubang 1 — `/kelas/[id]` memeriksa "punya paket atau tidak", bukan STATUS.**

```ts
if (!status.paketTertinggi && kelas.boleh_trial === false)   // KELIRU
```

Anak **trial punya paket** (paket trial dari `pengaturan_trial.trial_paket_id`), jadi `!paketTertinggi` tak pernah benar untuknya — tema non-trial **tetap bisa dibuka lewat tautan langsung**. Kelas bug yang sama dengan lubang worksheet sebelumnya: hak yang berasal dari trial diperlakukan setara hak berbayar.

**Lubang 2 — Mode Anak mengunci Ide Bermain memakai hak GAME.** `batasi = !status.game`, lalu `terkunci(k.boleh_trial) = batasi && boleh_trial === false` dipakai untuk **game, video, DAN tema**. Satu flag untuk tiga hak yang berbeda: paket yang memberi game tapi tidak Ide Bermain (atau sebaliknya) menghasilkan kunci pada fitur yang salah.

**Lubang 3 — pesannya tertukar.** `buka()` memeriksa `belumWaktunya` **lebih dulu**, jadi tema yang sekaligus belum-waktunya dan perlu-langganan memunculkan "bulan ke-N belum terbuka". Bagi yang tak punya haknya itu **janji palsu**: menunggu tak akan membukanya.

**Perbaikannya satu aturan murni**, `bolehBukaTema(tema, hak)` di `domain/entitlement.ts`:

| Keadaan | Hasil |
|---|---|
| paket tak punya `akses_ide_bermain` | `perlu-langganan` |
| `boleh_trial === false` & status bukan `aktif`/`tenggang` | `perlu-langganan` |
| selain itu | `boleh` |

Dipakai **ketiga** permukaan — `/kelas/[id]` (per ANAK yang dipilih, bukan hak tertinggi akun: satu akun bisa punya anak berbayar & anak trial), Mode Anak, dan Mode Ortu. Di Mode Anak urutan pemeriksaannya dibalik: **hak dulu → ajakan berlangganan**, baru bulan → pesan menunggu. Ikon & subteks kartunya pun ikut ("khusus pelanggan" vs "terbuka bulan ke-N").

**Tema tanpa kategori usia tak lagi ditampilkan ke anak** (`saringBerkategori`). Setelah 0101 setiap tema semestinya berkategori; yang tanpa kategori adalah materi yang belum selesai disiapkan. **Penjagaannya penting:** bila TAK SATU PUN tema berkategori — praktisnya 0101 belum dijalankan sehingga kolomnya tak terbaca — daftarnya dikembalikan **utuh**, sebab tanpa itu satu migrasi yang belum jalan akan mengosongkan seluruh Ide Bermain.

> **Pelajaran:** "punya paket" bukan sinonim "berhak". Trial, tenggang, dan berbayar semuanya punya paket — yang membedakan adalah `status`. Dan satu flag pembatas tak boleh dipakai untuk beberapa fitur: namai per fitur, atau kuncinya akan mengikuti fitur yang salah.

#### 🐞 "Rentang kategori sudah diganti, tapi angka di Ide Bermain tetap yang lama"

`kelas_bermain.usia_min/max` adalah **snapshot** dari kategorinya (0101). Dulu snapshot itu ditulis **apa adanya dari form**, dan form mengisinya dari baris LAMA saat Edit dibuka — penyegaran hanya terjadi kalau admin kebetulan menyentuh dropdown kategorinya. Rantainya:

```
admin ubah master Batita 1-3 -> 2-3
   -> `updateKategoriUsia` hanya menyentuh baris master              (materi tak ikut)
admin buka Edit materi, tekan Simpan
   -> form mengirim usiaMin/usiaMax dari SNAPSHOT LAMA (1-3)
   -> `updateKelas` menulisnya apa adanya                            (angka lama tersimpan lagi)
```

Tak ada galat, tak ada petunjuk — hanya angka yang membangkang. (Saran "buka lalu simpan ulang" yang sempat saya berikan karena itu **tidak menyelesaikan apa pun**.)

**Tiga perbaikan, dan ketiganya perlu:**

1. **Server menurunkan rentang dari MASTER, bukan dari kiriman klien.** `denganRentangKategori()` di `kelas-bermain-actions.ts`: selama materi punya `kategori_usia_id`, `usia_min/max`-nya SELALU mengikuti master. Klien tak lagi bisa mengirim rentang yang tak cocok dengan kategorinya. Materi tanpa kategori tetap memakai nilai form — di situ memang tak ada master untuk dirujuk.
2. **Mengubah master MENJALAR ke snapshot.** `updateKategoriUsia` kini ikut memperbarui `kelas_bermain` **dan** `paket_aset` milik kategori itu, lalu mengembalikan `ikut` = jumlah baris yang tersegarkan, dan UI menyebutkannya. Migrasi 0101 sengaja tak mengikat snapshot ke master supaya materi yang tayang tak berubah diam-diam — prinsip itu tidak dilanggar: penyegaran hanya terjadi saat admin **memang** mengubah rentangnya, tindakan sadar, bukan efek samping.
3. **Form menampilkan rentang master, bukan snapshot baris**, saat Edit dibuka — plus peringatan bila keduanya berbeda ("masih tersimpan 1–3 th, sedangkan Batita kini 2–3 th. Tekan Simpan untuk merapikannya"). Tanpa ini admin melihat angka basi lalu mengirimkannya balik.

`segarkan()` juga kini me-`revalidatePath('/admin/kelas-bermain')` dan `updateTag('katalog')` — tanpa itu perubahan sudah benar di basis data tapi masih lama di layar.

> **Pelajaran:** kalau sebuah nilai adalah **turunan** dari master, biarkan **server** yang menurunkannya saat menyimpan. Nilai turunan yang dikirim klien akan selalu punya jalur di mana klien mengirim balik salinan basi — dan gejalanya berupa "sudah saya ganti kok tidak berubah", yang paling sulit dipercaya justru oleh orang yang melaporkannya.

#### 🐞 AKAR MASALAH: rentang kategori usia BERTUMPUK di tahun batasnya

Setelah dua dugaan pertama (lihat di bawah) tak cocok dengan data, master `kategori_usia` sungguhan pemilik menjawabnya:

| Kategori | Rentang |
|---|---|
| Baby | 0–1 |
| Batita | 1–3 |
| Balita | 3–5 |
| Early Childhood | 5–6 |
| Middle Childhood | 6–9 |
| Late Childhood | 9–12 |

**Setiap tahun batas diklaim DUA kategori** (1, 3, 5, 6, 9). `cocokUsia` inklusif di kedua ujung, jadi tumpang tindih itu tak terhindarkan dengan penomoran seperti ini. `bracketUntukUmur` harus memilih salah satu, dan aturannya "yang paling SEMPIT menang" — aturan yang saya pilih sendiri dan ternyata **sewenang-wenang untuk bracket usia**:

```
 5 th -> Early Childhood (5-6)    (menang atas Balita 3-5: span 1 < 2)
 6 th -> Early Childhood (5-6)    (menang atas Middle Childhood 6-9)   <-- BUG
 3 th -> Batita (1-3)             (seri span 2, dipecah usia_min)
```

Anak **Alesha, 6 th**, karenanya mendarat di **Early Childhood (5–6)** — sedangkan satu-satunya tema untuknya ditaruh admin di **Middle Childhood (6–9)**. Early Childhood kosong → **seluruh tema terkunci**. Terbukti dengan menjalankan `konteksKurikulum` + `statusTemaBracket` memakai master & data anak sungguhan.

Perhatikan aturannya bahkan **tidak konsisten arah**: di usia 3 yang menang kategori BAWAH (Batita), di usia 5 & 6 yang menang kategori ATAS. Itu tanda bahwa "paling sempit" bukan aturan yang tepat — tapi selama rentangnya bertumpuk, aturan mana pun akan mengejutkan sebagian orang. **Data yang ambigu tak bisa diselamatkan aturan tie-break.**

**Yang bisa dilakukan kode: MEMPERLIHATKANNYA.** `domain/kategori-usia.ts` (murni & diuji) + halaman `/admin/kategori-usia` kini menampilkan:

- **⚠️ daftar rentang yang bertumpuk**, beserta tahun yang diperebutkan **dan kategori mana yang benar-benar menang** — daftar tumpang tindih tanpa menyebut pemenangnya masih menyisakan tebak-tebakan;
- **🛑 kategori yang belum punya Ide Bermain** — anak yang mendarat di sana tak melihat satu tema pun walau berlangganan;
- **🧭 peta umur 0–12 → kategori yang benar-benar dipakai**, dihitung dengan aturan yang sama persis dengan halaman anak. Satu-satunya cara memastikan anak berumur N mendarat di kategori yang dimaksud adalah MELIHATNYA, bukan menyimpulkannya dari rentang yang tertulis.

> **Pelajaran:** master data yang menentukan hak akses wajib punya **pemeriksa kesehatannya sendiri di halaman adminnya**. Tanpa itu, kekeliruan konfigurasi hanya muncul sebagai keluhan pengguna berbulan-bulan kemudian — dan terbaca sebagai bug kode, bukan sebagai data yang perlu dirapikan.

#### 🐞 "Anak berlangganan tapi SEMUA tema tertutup" — dua dugaan awal yang ikut diperbaiki

Dilaporkan pemilik: anak kategori 6–9 th sudah berlangganan Preschool, tapi di Main Hari Ini **seluruh tema terkunci**. Ada tema untuk kategori 6–9 di Bulan 1 Minggu 1, jadi ia semestinya terbuka. Penelusuran memakai data live menemukan **dua** cacat, bukan satu.

**SEBAB 1 — pembekuan umur memakai jangkar di masa lalu.** `siklusBerjalan` dulu mengembalikan `mulaiSiklus = tambahBulan(mulai, siklus - 1)`. Untuk anak yang jam bayarnya **tertahan** (mis. `kurikulum_mulai` hasil backfill 0104 tertulis 12 bulan lalu, tapi baru 1 bulan terbayar → `siklus = 1`), jangkarnya menjadi **12 bulan yang lalu**. Umur anak dibekukan pada umur setahun lalu: yang hari ini 6 tahun dihitung **5 tahun**, jatuh ke luar semua kategori usia (`TANPA_BRACKET`), dan setiap tema ber-kategori langsung terkunci karena `maksBulan[kat] = 0`.

Perbaikannya memisahkan dua hal yang sebelumnya tercampur:

| | Ditentukan oleh | Dipakai untuk |
|---|---|---|
| `siklus` | `min(kalender, bulan dibayar)` | **NOMOR** bulan kurikulum — berapa bulan yang terbuka |
| `kalenderKe` | kalender sejak `kurikulum_mulai` | **JANGKAR** pembekuan umur — periode yang sedang dijalani anak |

Pembekuan dimaksudkan menahan umur **selama satu periode berjalan**, bukan memakukannya di masa lalu. Penelusuran bracket kini menyusuri periode yang **benar-benar dijalani** (`1..kalenderKe`), lalu bayaran membatasi jumlah bulan yang terbuka (`maksBulan[b] = min(dijalani[b], siklus)`). Untuk pelanggan yang lancar `kalenderKe === siklus`, jadi perilakunya tak berubah sama sekali.

**SEBAB 2 — CELAH antar kategori usia.** Kategori live hanya **1–3** dan **6–9**. Anak berusia **4 atau 5 tahun tidak masuk kategori mana pun** → `TANPA_BRACKET` → semua tema ber-kategori terkunci, tanpa satu pun kalimat yang menjelaskan. Ini kekosongan **isi/konfigurasi**, bukan bug kode — tapi layar wajib mengatakannya (`adaTemaUntukBracket`).

**Cacat ketiga yang ikut ketahuan: pesannya BERBOHONG.** Semua tema terkunci dirender dengan `⏳ terbuka bulan ke-{n}` dan pesan *"tema ini menunggu bulan berikutnya ya!"* — padahal terkuncinya karena **usia**, dan menunggu tak akan pernah membukanya. Anak di bulan ke-1 bahkan melihat "terbuka bulan ke-1", yang menyangkal dirinya sendiri. `kunciKarena()` kini memisahkan `'usia'` dari `'bulan'`, dan `kelompokTemaBracket` mengembalikan `terkunciUsia` & `terkunciBulan` terpisah.

Akibatnya di layar:

- **Mode Anak** hanya mendaftarkan tema yang terkunci karena **bulan**. Tema kategori lain tak ditampilkan — alasan yang sama dengan judul bulan depan yang juga tak ditampilkan di sini: bagi anak, kartu yang tak akan pernah bisa dibuka hanyalah pintu palsu. Ketiadaannya **tidak senyap**: bila kategori usianya belum punya materi, layarnya menulis "🧸 Belum ada tema untuk usia ‹nama› (N tahun). Materinya sedang disiapkan ya."
- **Mode Ortu & `/kelas-saya`** menyebut kedua sebab terpisah, dan yang karena usia diberi keterangan **"menunggu tak akan membukanya"**.

> **Pelajaran yang berlaku umum:** saat sebuah gerbang punya lebih dari satu sebab, **sebabnya ikut dikembalikan**, jangan hanya boolean. Pesan yang salah sebab lebih merugikan daripada tak ada pesan — ia membuat orang menunggu sesuatu yang tak akan datang, lalu menyimpulkan aplikasinya rusak.

#### 🔍 Filter di Kelola Event — nama & rentang tanggal

Filter klien (`EventAdmin` sudah memegang `list` di state), memakai aturan yang sama dengan filter halaman lain: `cocokCari` + `rentangTerpakai` dari `domain/saring.ts`, jadi batasnya **inklusif** dan batas terbalik **ditukar** (dan penukarannya ditulis di layar).

**Yang khusus untuk event: sebuah event bisa punya TIGA tanggal.** Selain `tanggal` (gabungan), ada `baby_tanggal` dan `toddler_tanggal` dari migrasi 0069 ("event 2 kelas"). Event yang tanggalnya **hanya** diisi di kelasnya akan **lenyap dari daftar** bila filter hanya melihat `tanggal` — dan admin akan menyimpulkan event-nya terhapus.

`eventDalamRentang()` karena itu memeriksa **semua** tanggal event dan lolos bila **ada satu** yang masuk rentang (`some`, bukan `every`): event dua-hari yang menyeberangi batas rentang tetap harus ketemu.

Event **tanpa tanggal sama sekali** tetap lolos — mengikuti aturan yang sama dengan `dalamRentang`: baris yang tanggalnya tak diketahui justru yang perlu diperiksa, dan menyaringnya keluar hanya membuatnya tak pernah ketemu.

Judul bagian menyebut **"Event (2 dari 5)"** saat filter aktif, jadi jumlah yang tersaring tak pernah disembunyikan.

Uji daya gigit: hanya kolom `tanggal` yang dilihat → 4 tes jatuh; `some` diganti `every` → 1; event tanpa tanggal disaring keluar → 1.

#### 🔍 Filter di Catatan Tema — nama anak, judul tema, rentang tanggal

`/catatan-tema` bisa menumpuk cepat (satu anak × banyak tema × banyak bulan). Filternya berupa **form GET biasa**, bukan komponen klien: keadaan filter terbaca dari URL, bisa di-bookmark & dibagikan, dan saat ada laporan bug URL-nya sudah memuat seluruh keadaan yang perlu direproduksi.

Judul tema & kategori usia dipilih dari **dropdown** (sumber: Ide Bermain berstatus aktif, dan master kategori usia), jadi nilai `tema` di URL adalah sebuah **id** — pencocokannya tepat, tak lagi menebak dari teks. Label opsinya menyebut **kategori + posisi kurikulum** (`Judul — Batita · B1 M4`) supaya tema berjudul mirip tetap bisa dibedakan. Nilai `tema` yang bukan id dikenali sebagai **kata kunci** (cadangan untuk tautan lama), supaya URL yang dibagikan sebelumnya tak mendadak menghasilkan daftar kosong tanpa sebab. Filter kategori membaca `kategori_usia_id` **materinya**, jadi evaluasi yang temanya sudah tak aktif atau tak berkategori memang tak cocok dengan kategori mana pun.

Aturan penyaringan tanggal & teks di `domain/saring.ts` (murni & diuji) — dua kekeliruan yang ditutup di sana keduanya **terbaca sebagai data hilang**, bukan sebagai filter yang salah:

1. **Batas akhir INKLUSIF.** Batas eksklusif membuang catatan yang diisi pada hari terakhir rentang — dan itu tak terlihat sampai seseorang mencari catatan hari ini lalu tak menemukannya.
2. **Cap waktu dikonversi ke tanggal WIB**, bukan `updated_at.slice(0, 10)`. Potongan itu memberi tanggal **UTC**: evaluasi yang diisi pukul 01:00 WIB tanggal 24 tersimpan `…T18:00:00Z` tanggal 23, jadi ia akan **ditampilkan dan tersaring sebagai tanggal 23**. Tampilan tanggal di halaman ini ikut diperbaiki ke WIB — filter dan tampilan wajib memakai acuan yang sama, kalau tidak baris yang terlihat "23 Agu" tak akan muncul saat disaring 23 Agu.

Keputusan lain yang sengaja diambil:

- **Batas tanggal TERBALIK ditukar, bukan dijadikan nol hasil.** Pada sepasang kotak tanggal itu hampir selalu salah taruh. Penukarannya **ditulis di layar** ("Tanggalnya tertukar — yang dipakai: …"), jadi terlihat, bukan diperbaiki diam-diam.
- **Tanggal yang tak terbaca tetap lolos filter.** Menyaring keluar baris yang tanggalnya tak diketahui berarti menyembunyikan justru data yang perlu diperiksa.
- **Jumlah di samping nama anak dihitung DI DALAM rentang.** Kalau tidak, angka itu menjanjikan evaluasi yang tak akan muncul saat namanya diklik.
- **Rentang disaring di kode, bukan di query.** Batasnya tanggal WIB sedangkan `updated_at` cap waktu UTC, jadi `gte/lte` PostgREST meleset 7 jam di kedua ujung. Barisnya memang sudah diambil semua untuk menghitung jumlah, jadi tak ada query tambahan.
- **Anak & tema yang sedang DIBUKA tetap dihormati walau tak lolos filter.** Filter mempersempit daftar, bukan menutup halaman yang sedang dibaca — memantulkan pengguna ke anak lain saat ia mengetik akan membuat catatan yang sedang ditulis kehilangan konteks.
- **Batas 30 tombol nama anak kini DISEBUTKAN** ("+N anak lagi tak ditampilkan — pakai kotak Nama anak"). Sebelumnya `.slice(0, 30)` memotong diam-diam, dan itu terbaca sebagai "anaknya tak ada di sistem".
- Normalisasi kata kunci dipakai bersama `paginasi.ts` (`rapikanKunci`/`cocokCari`) — dua salinan aturan "cocok" berarti dua halaman bisa menjawab beda untuk kunci yang sama.

> **🐞 Cacat tata letak yang tertangkap saat verifikasi visual:** tombol `Reset` menjorok keluar dari kartu filter. Sebabnya `.kp-btn` punya **bayangan solid 6px di LUAR kotak elemen** (`box-shadow: 0 6px 0`), sedangkan padding kartu saya setel 10px. Padding bawah dinaikkan ke 18px. Pelajarannya: setiap kali `.kp-btn` ditaruh di wadah ber-padding kecil, sisakan ruang untuk bayangannya — `tsc` dan `build` tak akan pernah menangkap ini.

#### Daftar admin dikelompokkan per KATEGORI USIA

**Kenapa perlu:** posisi kurikulum (bulan ke-N · minggu ke-M) hanya berarti **di dalam** sebuah kategori. Daftar yang mencampur semua kategori memperlihatkan "B1 M1" beberapa kali dan terbaca seperti **duplikat**, padahal itu bulan-1-minggu-1 milik kategori yang berbeda-beda — kekeliruan baca yang persis melahirkan laporan bug "kok temanya dobel".

- Urutan kelompoknya mengikuti **master** (`kategoriOpsi`), bukan urutan baris — jadi susunannya sama dengan yang admin lihat di menu Kategori Usia.
- **Materi EVENT dipisah** ke kelompok tersendiri: ia tak punya posisi kurikulum, dan menaruhnya di dalam kelompok kategori membuat hitungan "4 tema/bulan" terbaca keliru.
- Kategori yang **sudah dihapus dari master**, atau materi yang **belum diberi kategori**, tetap ditampilkan di kelompok "❓ Tanpa kategori usia" — tidak dibuang. Justru inilah yang perlu dirapikan admin, dan daftar yang menyembunyikannya membuat materi itu tak pernah ketemu.
- Nama kategori **dihapus dari kartunya** (kepala kelompok sudah menyebutnya), tapi **rentang usia di kartu tetap ditulis**: itu snapshot milik materi, dan bedanya dengan rentang di kepala kelompok justru pertanda snapshot yang basi.

Diverifikasi visual di 900px & 390px — hierarkinya terbaca dan tak ada luberan horizontal.

#### 🎪 Materi EVENT vs TEMA kurikulum (0105)

Satu tempat menyusun materi, dua peruntukan. Radio button di form Ide Bermain:

| `jenis` | Tampil ke pengguna | Menempati posisi kurikulum |
|---|---|---|
| `'tema'` | ya | ya — satu (kategori, bulan, minggu) |
| `'event'` | **tidak** | **tidak** |

Kenapa satu tabel, bukan tabel baru: bentuk materinya identik (aktivitas, bahan, butir evaluasi, worksheet, sampul), begitu pula form & aksi adminnya. Tabel kedua berarti dua salinan dari semua itu — dan fitur duplikat event→tema justru akan menyeberangi tabel.

**Empat tempat yang harus sepakat**, dan masing-masing punya alasan sendiri:

1. **Indeks unik posisi** (`kelas_kurikulum_posisi_kategori`) diberi predikat `and jenis = 'tema'`. Tanpa itu materi event **menempati slot minggu** — admin kehabisan minggu di sebuah bulan tanpa alasan yang terlihat.
2. **Katalog pengguna menyaring DI QUERY**, bukan di kode: `getKelasAktifCached` menambahkan `.eq('jenis', 'tema')`. Kalau disaring di tiap pemanggil, satu pemanggil yang lupa sudah cukup untuk membocorkan materi event ke halaman anak — dan `getKelasAktifCached` dipakai 7 tempat.
3. **Server MENOLKAN posisinya** (`bulan_kurikulum = 0, urutan = 0`) untuk event, bukan hanya menyembunyikan field-nya di form. Form yang tak menampilkan sebuah field tetap bisa mengirim nilainya. Angka 0 dipilih karena itu bentuk yang **sudah** dipahami seluruh kode sebagai "tanpa posisi" (`posisiTema`/`statusTema` memeriksa `bulan < 1`) — tak perlu bentuk khusus baru.
4. **Penghitung admin mengabaikan event**: peringatan "4 tema/bulan", daftar minggu terpakai, dan `posisiBerikutnya` semuanya lewat `isTema()`.

**Duplikat event → tema** memakai mesin duplikat yang sudah ada; `RESET_SALINAN_TEMA` ditambahi `jenis: 'tema'`, jadi **salinan selalu menjadi tema** — termasuk (terutama) saat sumbernya event. Menyalin `jenis` sumber hanya akan menghasilkan event kedua, duplikat yang tak berguna bagi siapa pun. Dropdown-nya menandai sumber event (`🎪 EVENT · judul`), dan pesan sesudah menyalin menyebut hasilnya.

**🐞 Cadangan pra-migrasi versi pertama GAGAL KE ARAH YANG SALAH.** Rencananya: simpan gagal karena kolom `jenis` belum ada → ulangi tanpa kolom itu, "supaya tak gagal total". Terbukti keliru pada data sungguhan pemilik — probe menemukan baris ini:

```
tema  aktif  B0M0  kat=c5964a40  "FLY HIGH LITTLE EKSPLORER event offline"
```

Admin membuatnya sebagai EVENT (judulnya menyebut itu, dan posisinya ternolkan 0/0), tapi tersimpan `jenis = 'tema'` karena kolomnya belum ada saat itu. Hasilnya **tema tanpa posisi**, dan `bulan < 1` dulu berarti **'terbuka'** — jadi materi yang admin tandai "bukan untuk pengguna" justru menjadi yang paling mudah dilihat: ia melewati SELURUH penggerbangan kurikulum.

Dua perbaikan:

1. **Cadangan itu kini hanya berlaku untuk `jenis = 'tema'`.** Untuk EVENT, penyimpanan **ditolak dengan pesan yang menyebut migrasinya** (`0105_kelas_jenis.sql`). Gagal-dengan-pesan-jelas lebih baik daripada tersimpan salah arti — "jangan gagal total" bukan alasan yang sah bila kegagalannya membuka konten.
2. **Tema BER-KATEGORI tanpa posisi tidak lagi dianggap terbuka.** Kelonggaran "tanpa posisi = terbuka" memang untuk materi lama sebelum 0098 — dan materi lama itu **tak punya kategori**, jadi ia lewat jalur `TANPA_BRACKET`, bukan jalur ini. Baris ber-kategori dengan bulan 0 hanya bisa lahir dari kekeliruan penyimpanan.

Tes lama yang mengunci perilaku itu ("tema tanpa bulan kurikulum dianggap terbuka") dipecah dua: yang **tanpa kategori** tetap terbuka, yang **ber-kategori** kini terkunci. Uji daya gigit: mengembalikannya ke `'terbuka'` menjatuhkan tes itu.

> **Pelajaran:** saat memilih arah cadangan, tanya **apa yang bocor bila salah**, bukan hanya "apa yang rusak bila gagal". Cadangan yang membuka akses selalu lebih berbahaya daripada cadangan yang menolak menyimpan.

Uji daya gigit: salinan dibuat mewarisi `jenis` sumber → 1 tes jatuh. Tes kelengkapan "setiap field sumber ikut tersalin" ikut menangkap munculnya field baru — fixture-nya lalu diubah menjadi materi event, sehingga kasus nyatanya yang diuji.

#### 🐞 Bayaran membatasi TOTAL bulan, bukan per kategori

Ditemukan saat memverifikasi permintaan pemilik ("anak pindah kategori → mulai dari bulan ke-1"). Aturan pindah-kategorinya **memang sudah benar**, tapi batas bayarnya bocor:

```ts
maksBulan[b] = Math.min(dijalani[b], siklus)   // KELIRU: `siklus` berlaku untuk SETIAP kategori
```

Batas 3 bulan berlaku untuk Baby **dan** untuk Batita, jadi anak yang membayar 3 bulan lalu berhenti tetap membuka bundel bulanan keempat & kelima begitu kategorinya berganti — sampai 5 bundel untuk 3 bulan yang dibayar. Bertentangan dengan keputusan pemilik sendiri: *bulan yang tidak aktif tidak menambah hitungan*.

**Aturan sekarang:** bulan berbayar **DIBAGIKAN menurut urutan waktu**, totalnya dibatasi `siklus`.

| Bayar | Yang terbuka |
|---|---|
| 3 bulan | Baby 1, Baby 2, Batita 1 — lalu **berhenti** |
| +1 bulan | Batita 2 |

Dua penyesuaian yang menyertainya, keduanya ditemukan oleh tes yang jatuh:

1. **Bulan yang dijalani TANPA kategori tidak menghabiskan hak bayar.** Anak yang usianya sempat berada di celah antar-kategori dulu membakar bulan berbayarnya pada periode yang tak memberi tema apa pun — ia membayar dan tetap tak menerima apa-apa. (Tes "SEBAB 1" jatuh dan memperlihatkan ini; ekspektasinya benar, kodenya yang belum.)
2. **Tema di kategori yang SEDANG dijalani tak pernah terkunci karena usia.** Saat anak baru berganti kategori tapi bulannya belum terbayar, `maksBulan` kategori itu masih 0 — dan `kunciKarena` dulu melaporkan sebabnya `'usia'`. Keliru: sebabnya bayaran. Statusnya pun kini `kunci-judul` (judul saja), bukan `terkunci` penuh — anak itu memang sedang menunggu, bukan salah usia.

Uji daya gigit: kembali ke batas per kategori → 3 tes jatuh; bulan tanpa kategori ikut membakar hak → 2; batas bayar dilepas → 5; sebab kunci kategori berjalan kembali jadi `'usia'` → 1.

#### Urutan tampilan tema = petunjuk urutan mengerjakan

Daftar tema di sisi pengguna disusun **NAIK** menurut `(bulan_kurikulum, urutan)`, dan **posisinya ditulis di kartunya** — "Bulan ke-1 · Minggu ke-4" (`teksPosisi` di `domain/kurikulum.ts`, dipakai bersama oleh Mode Anak, Mode Ortu, dan `/kelas-saya`).

- **`sudahTerbuka` diubah dari MENURUN ke MENAIK.** Sebelumnya diurutkan dari yang terbaru dengan alasan "bulan lalu lebih relevan daripada bulan ke-1" — tapi daftar ini adalah **petunjuk urutan mengerjakan**, dan urutan menurun justru menyarankan orang tua memulai dari yang paling akhir. `kelompokTema` (generasi pertama, tak lagi dipakai halaman) dibiarkan apa adanya.
- **Urutannya dikatakan, bukan diserahkan ke tebakan**: "Dikerjakan berurutan dari atas — minggu ke-1 lebih dulu" muncul begitu ada lebih dari satu tema. Susunan yang benar tapi tak disebut akan terbaca sebagai kebetulan.
- **Materi tanpa posisi menghasilkan label KOSONG**, bukan "Bulan ke-0". Nomor yang tak ada lebih membingungkan daripada tak ada nomor.
- Kalimatnya disamakan di satu fungsi karena kalau tiga halaman menyebutnya dengan kata berbeda, orang tua akan menyangka ketiganya hal yang berbeda.

Uji daya gigit: `sudahTerbuka` dikembalikan menurun → 1 tes jatuh; pengurutan minggu dilepas (hanya bulan) → 2; `teksPosisi` dibiarkan menulis bulan 0 → 1.

#### Ukuran tombol dikecilkan (skala global)

Permintaan pemilik: tombolnya terlalu besar dan mendominasi tampilan. Yang diubah **hanya dua kelas dasar** — tak ada satu pun berkas komponen disentuh, sebab semua tombol mewarisi dari sini.

| Kelas | Sebelum | Sesudah | Tinggi |
|---|---|---|---|
| `.kp-btn` (135 pemakaian) | `padding 15/28`, font 18, bayangan 6px | `padding 11/20`, font **15**, bayangan **4px** | 51 → **39 px** |
| `.btn` admin (41 pemakaian) | `padding 10/18`, font **warisan**, bayangan 4px | `padding 8/16`, font **13** eksplisit, bayangan 3px | 38 → **34 px** |

Yang **tidak** diubah, dan alasannya:

- **`.btnSm` (198 pemakaian, tinggi 29px)** — sudah kecil. Mengecilkannya lagi akan membuat baris tombol admin (Edit/Nonaktifkan/Trial/Hapus) sulit disentuh di HP.
- **`.kp-tile` (menu Mode Anak)** — itu sasaran sentuh untuk ANAK, bukan tombol antarmuka orang tua. Daftar panjangnya pun sudah memakai varian `.kp-tile.rapat` (11px/17px) dari permintaan sebelumnya; yang tersisa berukuran penuh hanya 3 tile menu utama.

Dua hal yang ikut diperbaiki karena sekalian:

1. **Bayangan solid diproporsikan** (6→4px, 4→3px). Bayangan yang tak ikut mengecil membuat tombol kecil tampak melayang — dan ia berada **di luar kotak elemen**, jadi wadah ber-padding kecil perlu menyisakan ruang untuknya (lihat catatan cacat tombol Reset di bawah).
2. **`.btn` admin kini punya `font-size` eksplisit.** Sebelumnya ia mewarisi ukuran induknya, sehingga tombol yang sama tampil berbeda besar di halaman yang berbeda.

Diverifikasi dengan render sebelum/sesudah + pengukuran DOM: tinggi & font tiap kelas, dan pemeriksaan bahwa bayangan setiap tombol di dalam kartu masih tertampung padding wadahnya (sisa 18px). Ambang sentuh ~39px masih nyaman di HP; mengecilkan lagi akan mulai menyulitkan.

#### Tombol Edit harus MEMBAWA admin ke formnya

Form Ide Bermain dirender **di atas** daftar, sedangkan tombol Edit ada jauh di bawah. Menekan Edit karena itu terlihat **seperti tak melakukan apa pun** — form memang terbuka, hanya di luar layar. Kartu yang tak bereaksi tak bisa dibedakan dari tombol yang rusak.

- `formRef.scrollIntoView({ behavior: 'smooth', block: 'start' })` dipicu efek yang bergantung pada **penghitung pembukaan** (`bukaKe`), bukan pada `editId` atau `form`. Kalau bergantung pada `form`, guliran akan terjadi **setiap kali admin mengetik** — setiap ketukan mengubah state form. Penghitung dinaikkan di ketiga pembuka: Tambah, Edit, dan Duplikat.
- `bukaKe === 0` menjaga agar halaman tak menggulir sendiri saat pertama dimuat.
- `scrollMarginTop: 12` memberi jarak dari tepi atas, jadi kartunya tak menempel.
- **Kepala form menyebut judul materinya** ("Edit: PETUALANGAN DUNIA DINOSAURUS"). Sesudah digulirkan, admin perlu kepastian bahwa yang terbuka memang baris yang ia tekan — bukan materi lain.

Diverifikasi di browser (Playwright, tiruan halaman dengan 20 kartu): tekan Edit pada kartu terakhir di `scrollY 1214` → halaman bergulir ke `scrollY 4`, tepi atas form **12 px** dari viewport, dan judulnya cocok dengan kartu yang ditekan. `tsc` maupun `build` tak bisa menangkap kegagalan semacam ini.

#### 📄 Unduh worksheet: gerbang keanggotaan, plafon trial 1×

**🐞 Bug yang diperbaiki: yang bukan pelanggan masih bisa mengunduh.** Ada TIGA lubang sekaligus, dan semuanya harus ditutup bersama:

1. **`worksheet_terbuka` diperiksa PALING AWAL** di `mintaWorksheet()` dan langsung mengembalikan URL — siapa pun yang login bisa mengunduh materi bertanda itu, tanpa langganan apa pun. Penanda "contoh gratis" seharusnya membebaskan dari **kuota**, bukan dari **keanggotaan**.
2. **Hak dari TRIAL diperlakukan sama dengan hak berbayar.** `getStatusWorksheet` hanya melihat `paketTertinggi`, dan paket trial (`pengaturan_trial.trial_paket_id`) bisa membawa `worksheet = true` dengan `worksheet_kuota_jumlah = 0` — yang berarti **tanpa batas**.
3. **`hakAksesAkun` tak membawa status**, jadi pemanggil memang tak punya cara membedakan trial dari berbayar.

**Aturan sekarang** (`sisaWorksheetAkun` di `domain/kuota-worksheet.ts`, murni & diuji):

| Mode | Hak |
|---|---|
| `tidak` — bukan pelanggan | **tak boleh sama sekali**, termasuk materi `worksheet_terbuka` |
| `trial` | **`TRIAL_WORKSHEET_MAKS` = 1 unduhan, SEUMUR trial**; `worksheet_terbuka` pun memakai jatah itu |
| `member` (aktif / tenggang) | kuota paketnya seperti dulu; `worksheet_terbuka` bebas kuota |

- **Plafon trial dihitung dari SELURUH riwayat unduhan**, bukan periode berjalan. Kalau dihitung per bulan, trial yang menyeberang bulan mendapat jatah dua kali.
- **Plafon trial hanya MENGURANGI, tak pernah menambah.** Bila paket trial memang tak memberi hak worksheet, hasilnya tetap nol — kalau tidak, aturan ini diam-diam menghidupkan fitur yang sengaja dimatikan admin.
- **Masa tenggang ikut `member`**: seluruh aplikasi memperlakukan tenggang sebagai masih memegang paketnya, dan worksheet tak boleh jadi satu-satunya fitur yang menjawab lain untuk anak yang sama.
- **`hakAksesAkun` kini membawa `status`**, diambil dari anak yang paketnya TERPILIH — bukan status "terbaik" mana pun. Kalau diambil dari anak lain, akun bisa tampak berbayar hanya karena satu anaknya masih trial.
- **Cadangan tabel-belum-ada di sini MENUTUP, bukan membuka** — satu-satunya tempat di repo ini yang begitu. Bila `unduhan_worksheet` tak terbaca, plafon trial dianggap sudah terpakai: kalau unduhan tak bisa dicatat, "satu kali" tak bisa ditegakkan sama sekali, dan jatah gratis tanpa batas lebih merugikan daripada tombol yang mati. Untuk **member** cadangannya tetap membuka (kuota bulanan, kerugiannya kecil).
- **UI mengikuti aturan yang sama, bukan menampilkan lalu ditolak**: `KelasIsi` menerima `modeWorksheet`, dan tombolnya hanya muncul bila haknya ada. Kalimat penolakannya dipisah per keadaan (`pesanTolak`) — "belum berlangganan", "jatah trial habis", dan "kuota paket habis" menuntut tindakan yang berbeda dari orang tua.

#### 💬 Tombol WA orang tua di antrean konsultasi (admin)

`/admin/psikolog` → antrean **Konsultasi menunggu verifikasi pembayaran** kini punya tombol **💬 WA ortu** dengan pesan siap kirim yang menyebut anak, jadwal, psikolog, nominal, dan batas bayarnya — satu akun bisa punya beberapa reservasi, jadi pesan yang tak spesifik memaksa orang tua bertanya "sesi yang mana".

- Nama & nomor diambil **terpisah**, bukan lewat embed PostgREST `ortu:ortu_id(...)`: `pendaftaran_konsultasi` punya **dua** foreign key ke `profiles` (ortu & psikolog), dan embed pada tabel bertautan ganda mudah menjadi ambigu (PGRST201) — kegagalannya mematikan SELURUH antrean, bukan hanya kolom nomornya.
- Nomor belum terisi → keadaan itu **dikatakan** ("nomor WA ortu belum terisi"), bukan tombol mati tanpa sebab.
- **Kenapa hanya di halaman ADMIN:** hanya admin/superuser yang boleh membaca `profiles` orang lain (0056). Area Psikolog (`/psikolog`) tak bisa menampilkan tombol ini tanpa lebih dulu memberi psikolog hak baca nomor WA orang tua — pelebaran akses data pribadi yang butuh keputusan tersendiri, bukan efek samping sebuah tombol.

#### Jam kurikulum: siklus kalender, kategori beku, nomor bulan per kategori (0104)

**Tiga kekeliruan yang diperbaiki**, semuanya ditemukan saat memeriksa skenario "anak join 3th11bl lalu ulang tahun di tengah siklus":

| Dulu | Sekarang |
|---|---|
| Nomor bulan = `langganan_anak.bulan_kurikulum` = **jumlah bulan dibayar**. Bayar 12 bulan → `+12` seketika → 48 tema terbuka sehari | Nomor bulan = **siklus kalender**, dibatasi bulan yang dibayar: `min(bulan kalender lewat + 1, bulan dibayar)` |
| Umur dihitung ulang **setiap render** → ulang tahun di tengah bulan langsung mengganti daftar tema | Umur dihitung pada **AWAL siklus berjalan** → daftar tema beku sepanjang siklus |
| Satu penghitung bulan per anak, **bukan per kategori** → naik ke kategori berikutnya membuka semua bulan ≤ penghitung sekaligus | Nomor bulan dihitung **per kategori**; kategori baru dimulai dari **bulan ke-1** |

**Semuanya DITURUNKAN, tak ada penghitung berkala.** Yang tersimpan hanya `langganan_anak.kurikulum_mulai` (0104, tanggal WIB siklus pertama, diisi sekali di `setPaketAnak`) dan `bulan_kurikulum` (kini berarti **batas bulan yang sudah dibayar**, bukan nomor bulan yang tampil). Dari keduanya `domain/siklus-kurikulum.ts` menghitung siklus, kategori beku, dan bulan-dalam-kategori. Tak ada cron yang bisa gagal diam-diam, dan tak ada penulisan saat halaman dirender.

- `siklusBerjalan()` — `min(kalender, dibayar)` **menahan dari dua arah**, dan keduanya perlu: tanpa batas kalender pelanggan tahunan membuka 12 bulan sekaligus; tanpa batas bayar, anak yang berhenti berlangganan tetap naik tiap bulan.
- `konteksKurikulum()` — menelusuri siklus 1..n dan menghitung umur di **awal tiap siklus**. Karena umur hanya bertambah, siklus dalam satu kategori selalu berurutan, jadi jumlah siklus di sebuah kategori = nomor bulan di kategori itu. Hasilnya juga memberi `maksBulan` per kategori, yang membuat **tema kategori LAMA tetap terbuka selamanya** (keputusan pemilik) tanpa menyimpan apa pun.
- `statusTemaBracket()` — dua jalur, supaya materi lama tak ikut mati: tema **ber-kategori** digerbangi per kategori; tema **tanpa kategori** (sebelum 0101) tetap memakai rentang usianya tapi dicocokkan dengan **umur beku**, dan digerbangi oleh siklus keseluruhan.
- `tambahBulan()` **menjepit akhir bulan**: 31 Jan + 1 bulan = 28 Feb, bukan 3 Mar. `Date.setUTCMonth` meluber, dan luberan itu menggeser siklus seorang anak maju sehari tiap beberapa bulan tanpa pernah dikoreksi.
- Rentang kategori **bertumpuk** (data live: 1–3 th dan 3–6 th sama-sama memuat usia 3) diselesaikan dengan memilih yang **paling sempit**, seri dipecah `usia_min` lalu `id` — deterministik, tak berubah hanya karena urutan baris dari basis data berubah.

> **⚠️ Cadangan pra-migrasi yang SENGAJA tidak netral:** bila `kurikulum_mulai` belum ada (0104 belum jalan), `siklusBerjalan` memakai **perilaku lama** (siklus = bulan dibayar), BUKAN siklus 1. Memilih 1 akan mengunci tema bulan ke-2+ untuk anak yang tadinya sudah membukanya — dan konten yang mendadak terkunci terbaca sebagai fitur dicabut, bukan sebagai migrasi yang belum dijalankan. Ada tesnya.

> **Batas yang diketahui:** pembekuan butuh `kurikulum_mulai`, dan itu baru terisi pada aktivasi berbayar pertama. Anak **trial/Basic** tak punya baris `langganan_anak`, jadi bagi mereka umur dihitung dari hari ini — mereka toh selalu di bulan ke-1. Backfill 0104 memakai `updated_at` sebagai perkiraan tanggal mulai, sebab `langganan_anak` tak punya `created_at`.

#### Posisi kurikulum: unik PER KATEGORI USIA (0101–0103)

- Sebuah tema menempati satu slot **Bulan ke-N · Minggu ke-M** (`kelas_bermain.bulan_kurikulum`, `urutan`). `urutan` **adalah minggu**, bernilai **1..4** — `posisiTema()` menurunkan "Minggu ke-M" langsung dari sana, jadi angka di luar 1..4 akan memunculkan "Minggu ke-7" di rapor anak.
- **Keunikannya dihitung per kategori usia, bukan global.** Bayi dan Prasekolah adalah **kurikulum yang berbeda**: keduanya berhak punya Bulan 1 Minggu 1 sendiri. Indeks `kelas_kurikulum_posisi_kategori` (0103) memakai `coalesce(kategori_usia_id, uuid nol)` supaya materi **tanpa** kategori pun tetap satu kelompok — tanpa `coalesce`, tiap `NULL` dianggap unik dan aturannya bocor untuk mereka. Hanya berlaku pada tema **aktif**, supaya tema lama bisa "diparkir" (nonaktif) dan slotnya dipakai penggantinya.
- **⚠️ 0102 sempat memasang indeks GLOBAL dan itu keliru** — dua kategori saling merebut slot. 0103 membuang indeks itu, **menomori ulang per kategori** (`bulan = ((n-1)/4)+1`, `urutan = ((n-1)%4)+1`), lalu memasang indeks yang benar. Versi pertama 0102 bahkan **gagal** dengan `Key (bulan_kurikulum, urutan)=(1, 0) is duplicated`, karena semua materi lama memakai nilai bawaan `(1, 0)`: indeks unik tak bisa dipasang sebelum datanya dirapikan.
- **Form admin mengisi posisinya sendiri.** `posisiBerikutnya()` (murni & diuji) mencari slot bebas pertama dalam kategori itu — 1,2,3,4 lalu **pindah bulan**, tak pernah ada minggu ke-5. Dihitung ulang saat **kategori diganti**; saat mengedit, memilih kembali kategori asal **tidak** menggeser posisi materi itu. Nilainya masih bisa digeser manual, tapi dijepit 1..4 **di server juga** (`kelas-bermain-actions.ts`) — form bukan tempat menegakkan aturan data.
- Peringatan "bulan ini tak berisi 4 tema" juga dikelompokkan per kategori: "bulan 1 sudah 4 tema" pada Bayi tak berarti apa pun bagi Prasekolah.

#### Duplikat tema untuk kategori usia lain

Satu tema sering dipakai untuk beberapa kategori usia — judul, tujuan, dan bahannya sama, yang berbeda hanya **aktivitasnya**. Dropdown **⧉ Duplikat** di `/admin/kelas-bermain` (pola yang sama dengan "Duplikat parameter dari event lain") mengisi form dari tema yang sudah ada.

- **Tidak menulis apa pun ke basis data.** Ia hanya MENGISI form; tema baru lahir saat admin menekan Simpan. Duplikat yang langsung menulis akan meninggalkan tema separuh jadi setiap kali admin berubah pikiran.
- Aturan "apa yang dibawa" ada di `salinTemaKeKategoriLain()` + `RESET_SALINAN_TEMA` (`domain/kurikulum.ts`, murni & diuji). **Kategori usia dan posisi kurikulum sengaja dikosongkan**: membawa kategori sumber menghasilkan salinan yang tak sah — posisinya pasti bentrok dengan sumbernya (`kelas_kurikulum_posisi_kategori`, 0103). Begitu kategori tujuan dipilih, posisinya dihitung di kategori itu.
- **Salinannya DALAM (`structuredClone`).** `aktivitas`/`bahan` adalah array bersarang; salinan dangkal membuat suntingan pada salinan ikut mengubah tema sumbernya — kerusakan yang baru terlihat setelah keduanya tersimpan. Ada tesnya, dan mutasi menjadi salinan dangkal menjatuhkannya.
- **Satu pemeta baris→form (`dariRow`)** dipakai bersama Edit dan Duplikat. Dua salinan pemetaan berarti field yang baru ditambahkan terbawa di satu jalur dan hilang di jalur lain.
- Sampul & worksheet **menunjuk berkas storage yang sama**, dan itu aman: unggahan pengganti selalu membuat objek baru (`kelas/<waktu>`, `worksheet/<waktu>`) dan `hapusKelas` hanya menghapus baris, tak pernah objeknya. Jadi salinan tak bisa saling merusak asetnya.
- Kartu daftar admin menyebut **nama kategorinya**, dan judul kembar **di kategori yang sama** diperingatkan (bukan dilarang — admin boleh punya dua varian). Tanpa keduanya, dua tema berjudul identik tak bisa dibedakan di daftar.

> **⚠️ Yang perlu diawasi:** penyaringan usia (`cocokUsia`) **inklusif di kedua ujung**. Bila dua kategori bersinggungan di batasnya (mis. 0–2 th dan 2–4 th), anak berusia tepat 2 tahun **cocok untuk keduanya** dan akan melihat dua tema berjudul sama. Rentang kategori sebaiknya tak bertumpuk (0–2 dan 3–5), atau salinannya diberi judul yang membedakan.

#### Evaluasi per aktivitas (0098)

- Butir evaluasi = **kalimat bebas** yang diinput admin **per aktivitas**, disimpan di dalam `kelas_bermain.aktivitas jsonb` (`evaluasi: string[]`) karena jumlah butirnya tak seragam. `game_paket_id` (opsional) tinggal di jsonb yang sama.
- Hasilnya di tabel `evaluasi_kurikulum`, **unique (anak_id, kelas_id, `peran`)** — tanpa `peran` di kunci, checklist guru akan **menimpa** checklist orang tua pada tema yang sama; kehilangan data yang tak terlihat sampai rapor dicetak.
- `hasil` menyimpan **snapshot kalimat**, bukan indeks. Begitu admin menyunting materi, rapor bulan lalu tak boleh berubah arti. Pola yang sama dipakai `catatan_perkembangan.penilaian` (0062) & `kegiatan_anak.judul` (0093).
- **Kalimat butir diambil ulang dari materi di server** (`susunHasilEvaluasi`, murni & diuji); klien hanya menyebut *aktivitas ke-i, butir ke-j*. Rapor ditunjukkan ke orang lain, jadi isinya harus berasal dari materi — bukan dari browser. Indeks yang menunjuk butir tak ada (materi berubah sejak layar dibuka) diabaikan, butir kosong tak pernah jadi baris rapor.
- **Peran ditentukan server** dari profil; ortu pemilik menang lebih dulu, jadi admin yang menilai anaknya sendiri tetap tercatat `ortu`.
- **UI**: `components/AktivitasTema.tsx` (client) merender kartu aktivitas **beserta tombol game & checklist-nya di dalam kartu itu**, lalu **satu tombol simpan** di bawah — satu tema tersimpan sebagai satu baris. Centang awal dicocokkan lewat **kalimat**, bukan indeks. Penanda **"belum tersimpan"** wajib ada.

> **🐞 Bug yang sempat terjadi:** Mode Anak (`MenuAnak`) merender `KelasIsi` **tanpa `anakId`**, sehingga checklist mati dan tombol game tak pernah muncul — padahal justru di sanalah anak membuka materi. Pelajarannya: prop hak/identitas yang **opsional** akan diam-diam tak dipasang oleh sebagian pemanggil. Bila sebuah komponen butuh konteks anak, periksa **semua** pemanggilnya (`grep -n "KelasIsi" src`), bukan hanya yang sedang dikerjakan.

#### Catatan tema oleh admin/guru/psikolog (0099)

**Konsepnya: RESPONS, bukan penilaian mandiri.** Catatan Tema adalah tanggapan guru/psikolog atas **evaluasi yang sudah diisi orang tua** — bukan tempat menilai tema mana pun. Karena itu halaman `/catatan-tema`:

- **hanya mendaftar tema yang sudah dievaluasi orang tua** untuk anak itu (`evaluasi_kurikulum` peran `ortu`), lengkap dengan posisi kurikulumnya (Bulan ke-N · Minggu ke-M) dan tanggal pengisian. Belum ada evaluasi → belum ada yang perlu ditanggapi, dan itu dikatakan;
- menampilkan **isian orang tua apa adanya, per aktivitas** (read-only) sebagai konteks;
- menampilkan **hasil game** yang menempel pada aktivitas tema itu (`hasil_main.paket_id`, kolom 0044): dimainkan berapa kali, bintang, berapa kali selesai, waktu tercepat, terakhir main. Game yang **tak pernah dimainkan ditulis "— belum dimainkan"**, BUKAN nol: nol berarti "sudah main tapi tak dapat apa-apa", dan dua hal itu tak boleh terlihat sama. Waktu tercepat hanya dihitung dari sesi yang **selesai** — sesi yang ditinggal di tengah punya durasi kecil dan akan tampak sebagai rekor palsu;
- **penilaiannya PER TEMA**, bukan per aktivitas — rincian per aktivitas memang sudah diisi orang tua, dan formnya menyatakan itu.

> **Migrasi 0100 — guru boleh membaca `hasil_main`.** Tanpa itu laporan game selalu kosong untuk guru dan catatannya jadi tebakan. Tabel itu sebelumnya hanya terbuka untuk ortu pemilik (0002), admin (0006), dan psikolog yang menangani anak itu (0066). Cakupan guru dibuat seluas hak guru yang sudah ada (`pendaftaran_event`, `catatan_perkembangan`, `evaluasi_kurikulum`) — semua anak, sebab guru di aplikasi ini peran internal, bukan wali kelas per rombongan. **Hanya SELECT**: guru tak boleh mengubah skor anak.


#### Di rapor

- Layar (`LaporanAnakView` & rapor bulanan) punya **dua blok terpisah**: 🍎 catatan guru/psikolog per tema, dan 📋 evaluasi kurikulum (checklist) — masing-masing menyebut penilainya. Laporan diri dan penilaian pendidik tidak setara sebagai bukti.
- Di **JPEG**, catatan tema **digabung ke bagian "Catatan perkembangan"** yang sudah ada (bentuknya persis sama: penilaian + catatan + penulis). Menambah bagian baru di kanvas hanya akan memicu pertarungan ruang lagi, padahal isinya sejenis.

> **⚠️ Tata letak JPEG — enam kali render, dan pelajarannya bukan soal angka.** Percobaan 1–4 berusaha **mencadangkan ruang** untuk blok evaluasi di dasar kolom kiri: (1) cadangan itu memotong daftar Ide Bermain diam-diam → ditambahkan "…dan N lainnya"; (2) baris tambahan itu membuat evaluasi menabrak footer; (3) cadangan diperbesar → seluruh temanya hilang, tinggal "…dan 6 tema lain"; (4) dipaksa `yK = batasKiri` → tulisan bertumpuk. Yang akhirnya menyelesaikan: **menggambar bagian terpenting LEBIH DULU** — evaluasi kurikulum kini bagian pertama kolom kiri, dan daftar kegiatan di bawahnyalah yang menyusut (selalu disertai "…dan N lainnya"). Dua penjaga menyertainya: tiap bagian berikutnya hanya digambar bila ruangnya cukup untuk **judul + 1 baris** (tanpa itu judulnya tercetak lalu isinya menembus footer), dan baris rincian yang kena anggaran disebut lewat "…rincian aktivitas dipersingkat". Cacat terakhir — baris penutup yang tak memperbarui `yK` sehingga bertumpuk dengan judul berikutnya — baru muncul **karena** bloknya dipindah ke atas; nilai balik yang diabaikan tak berakibat apa-apa selama ia bagian terakhir.

### 📄 Rapor Bulanan & Aktivitas Mandiri — `/anak/[anakId]/rapor/[ym]` (migrasi 0093)
- **Masalah yang diselesaikan**: rapor sudah memuat game, catatan guru, sertifikat, dan konsultasi — tapi **Ide Bermain yang dikerjakan di rumah dan video yang ditonton sama sekali tak tercatat per anak**, padahal itu inti homeschooling.
- **Kenapa tabel baru `kegiatan_anak`, bukan `riwayat_kelas`**: tabel itu berkunci `(ortu_id, kelas_id)` dan hanya menyimpan waktu **terakhir** — bukan per anak, bukan riwayat. `aktivitas` (0046) juga tak cukup: isinya hanya nama fitur untuk analitik, tanpa rujukan materi.
- **Kolom**: `anak_id`, `ortu_id`, `jenis` (`ide-bermain`|`video`), `ref_id`, `judul` (**snapshot** — rapor tetap terbaca bila materinya diubah/dihapus), `waktu`. RLS: ortu pemilik + admin/guru + `boleh_lihat_laporan_anak` (0066). **Tanpa UPDATE/DELETE untuk ortu** — rapor tak boleh bisa "dirapikan" belakangan.
- **Titik pencatatan**: `MenuAnak` saat materi Ide Bermain dibuka (di samping `catatRiwayatKelas` yang sudah ada) dan saat video diputar (`VideoPojok` kini punya prop `onTonton`). `catatKegiatan` **menelan galatnya sendiri**: pencatatan rapor tak boleh menggagalkan aktivitas anak.
  - **Sengaja belum dicatat**: Mode Ortu menampilkan semua materi terbuka sekaligus (tak ada "dibuka"), dan `/kelas/[id]` tak punya konteks anak sehingga kegiatan tak bisa diatribusikan.
- **Agregasi** di `lib/domain/laporan-bulanan.ts` (murni, 14 tes): `rentangBulan`, `labelBulan`, `bulanTerakhir`, `ringkasBulan`. Semua batas waktu memakai **WIB** — kegiatan malam tanggal 31 tak boleh pindah bulan. Tipe isinya juga tinggal di sini: `NilaiRingkas` (area + indikator + kode skala PAUD), `CatatanRingkas`, `RekomendasiRingkas` (naratif psikolog + butirnya), `ItemRingkas` (`produk`|`event`|`materi`).
- **Rapor bulanan** dirender di halaman + **Unduh JPEG A4 portrait, satu atau dua halaman** (`lib/rapor-jpeg.ts`, memakai ulang `kartu-bersama.ts`: `ukuranPas`, `muatGambar`, `siapkanFont` — tanpa dependensi baru). Haknya `raporBulanan` dari **paket ANAK itu**; anak paket lain tetap melihat rapor berjalan, hanya berkas bulanannya terkunci.
- **Isi rapor bukan cuma angka.** Selain statistik (Ide Bermain, video, sesi game, menit, area terbanyak) rapor — di halaman **dan** di JPEG — memuat:
  - **Catatan perkembangan penuh** dari event yang diikuti bulan itu: tiap baris `catatan_perkembangan` ditulis sebagai `Area: Indikator — KODE` (BB/MB/BSH/BSB, label dari `metaSkala`) plus catatan bebas gurunya. Sebelumnya rapor hanya menyebut *jumlah* catatan — padahal inilah barang yang dibayar orang tua.
  - **Hasil konsultasi psikolog**: rekomendasi naratif (`rekomendasi_anak` + butirnya) **dan** `rekomendasi_item` yang dibagi per jenis — **produk, event, dan ide bermain**. `jenis='materi'` ditulis ke layar sebagai **„ide bermain”** (nama internal ≠ nama tampil).
  - Keduanya difilter `created_at` di dalam `rentangBulan(ym)`, bukan diambil semua — rapor Agustus tak boleh memuat rekomendasi September.
- **⚠️ Tata letak kanvas: ruang untuk blok terakhir harus DICADANGKAN, bukan disisakan.** Di JPEG, kolom kiri diisi daftar pendek (Ide Bermain, video, area, kelas yang diikuti) dan kolom kanan diisi catatan perkembangan lalu konsultasi. Catatan dibatasi `plafonCatatan` (55% kolom kanan bila ada konsultasi) dan narasi psikolog dibatasi `plafonNaratif = BATAS_BAWAH − cadanganItem`, dengan `cadanganItem` dihitung dari jumlah item (maks `MAKS_ITEM = 4`, sisanya jadi „…dan N lain”). Tanpa pencadangan itu, blok „🎁 Direkomendasikan” — yang justru diminta pemilik — terpotong habis oleh catatan yang panjang. **Dua kali cacat ini hanya ketangkap dari render, bukan dari membaca kode**: iterasi pertama menghilangkan seluruh bagian konsultasi, iterasi kedua menghilangkan daftar itemnya. Setiap perubahan tata letak kanvas wajib dirender & dilihat.

> **⚠️ `hasil_main` memakai kolom `tanggal`**, bukan `created_at`/`dibuat_at` (migrasi 0002). Nama kolom yang salah pada `select`/filter **gagal SENYAP** lewat PostgREST — query mengembalikan error yang mudah diabaikan dan rapornya menampilkan 0 sesi tanpa tanda apa pun. Ini sempat terjadi saat sub-proyek C dibuat.

### 🏅 Sertifikat & Stiker — `/sertifikat/[id]`, `/stiker-event/[id]`
- **Fungsi data**: `getSertifikat(id)` (`sertifikat.ts`); stiker (**guard admin** `getAdminTerjamin`): `getEventAdmin(id)`, `getPendaftaranByEvent(id)`.
- **Komponen**: `SertifikatView`, `StikerSheet`, `UnduhPdfBtn` (stiker & peserta), **`UnduhSertifikatBtn`** (sertifikat).
- **Sertifikat diunduh sebagai JPEG A4 landscape** (`lib/sertifikat-jpeg.ts` `buatSertifikatJpeg()`), **bukan** lewat dialog cetak. Alasannya: ukuran berkas jadi **pasti** — cetak-ke-PDF bergantung setelan skala/margin/header-footer pengguna, dan itulah sumber keluhan ukuran sebelumnya. Kanvas **3508×2480 px** = A4 landscape 297×210 mm @300 DPI; rasio 1,414:1 sama persis dengan tampilan layar sehingga tata letaknya identik. Ekspor `toBlob('image/jpeg', 0.92)`.
  - **Warna**: seluruh teks **HITAM**, kecuali **NAMA ANAK** yang tetap memakai warna brand. Berlaku di JPEG **dan** di `SertifikatView` (layar) supaya keduanya sama.
  - Template dari admin digambar `contain` (`gambarMuat`) agar tidak terpotong; gagal muat (CORS/404) → jatuh ke desain pastel bawaan, kartu tetap terbentuk. `crossOrigin='anonymous'` mencegah kanvas ter-taint sehingga `toBlob` tidak pernah melempar SecurityError.
  - Ukuran teks memakai `ukuranPas` (dari `kartu-bersama`), jadi nama/judul event panjang **mengecil**, tidak terpotong. Blok teks dipusatkan vertikal dari tinggi total yang dihitung lebih dulu.
- **Nama di stiker**: memakai **`anak.nama_panggilan`** (fallback: kata pertama nama lengkap) — join `anak` per `anak_ids` pendaftaran.
- **Isi stiker = nama + kategori kelas saja.** Sapaan pembuka **"Hai, aku" dihapus** (permintaan pemilik); ruang yang ditinggalkannya membuat nama 2 baris makin longgar (tinggi isi maksimum turun 162px → **132px** dari 187px yang tersedia).
- **Warna & ukuran font stiker**: seluruh teks **MERAH `#d62828`** (permintaan pemilik; satu konstanta `MERAH` agar kedua baris tak lepas sinkron — merah pekat, bukan `#f00`, supaya tetap terbaca di atas template terang maupun gradasi pastel bawaan). Ukurannya diperbesar: kategori kelas **16pt**, nama sampai **34pt**.
- **Nama stiker menyesuaikan ukuran sendiri** — `ukuranNama()` di **`lib/domain/stiker.ts`** (murni & diuji, 6 tes). Tangga `[pt, maks karakter/baris]` = `34/11 · 28/13 · 23/16 · 19/20`; dipilih ukuran terbesar yang memenuhi **dua** syarat, keduanya dari bukti render: (a) **kata terpanjang muat satu baris** — kalau tidak, `overflow-wrap:anywhere` memenggal kata di tengah (`Puspaningru | m`); dan (b) **maksimum 2 baris** — baris ke-3 mendorong isi melewati tinggi 60mm lalu terpotong `overflow:hidden`. Nama panggilan pendek (mayoritas) tetap dapat 34pt. Diverifikasi visual dengan render 10 stiker (nama 2–20 karakter): tak ada yang terpotong, tinggi isi maksimum 162px dari 187px yang tersedia.
- **Nama di SERTIFIKAT: NAMA LENGKAP** (`anak.nama`) — sengaja berbeda dari stiker yang memakai nama panggilan. `sertifikat.anak_nama` hanyalah **snapshot** yang berasal dari snapshot pendaftaran; bila orang tua melengkapi nama anak setelah mendaftar, snapshot itu basi (mis. hanya nama depan). Karena itu: (a) **saat generate**, nama diambil dari tabel `anak` terkini (snapshot dipakai hanya bila baris anak tak terbaca); dan (b) **saat dibaca** (`getSertifikat`, `getSertifikatAnak`), nama ditimpa dengan `anak.nama` terkini — sehingga **sertifikat LAMA pun ikut benar tanpa perlu di-generate ulang**.
- **Baris kedua stiker = KATEGORI KELAS**, bukan judul event (permintaan pemilik). Sumbernya `pendaftaran_event.kelas` → `Baby Class` / `Toddler Class`. **Dibawa per stiker, bukan per lembar** — satu event bisa memuat peserta Baby dan Toddler sekaligus, jadi `StikerSheet` menerima `items: {nama, kelas}[]`, bukan satu `kelas` global. Kelas `gabungan`/kosong → baris itu **tidak dirender** (lebih baik kosong daripada memunculkan kembali nama event yang diminta dihapus). Judul event tetap dipakai untuk **nama berkas PDF** dan header layar (`no-print`).
- **⚠️ Paginasi stiker — bug "terpotong di batas halaman" & perbaikannya**: versi lama memakai SATU CSS Grid panjang dan mengandalkan `break-inside: avoid` pada tiap stiker. **Chrome tidak menghormati itu untuk grid item saat memaginasi**, sehingga baris ke-5 terpenggal separuh. Sekarang stiker dipotong sendiri menjadi kelompok **10 (`PER_LEMBAR`)**, tiap kelompok jadi satu blok `display:flex` dengan **`break-after: page`** — tidak ada baris yang bisa menyeberang halaman. Hitungannya: 5 baris × 60mm = **300mm**, F4 330mm − margin 2×5mm = **320mm** (sisa 20mm).
- **CSS cetak stiker**: `@page{size:215mm 330mm; margin:5mm}` (dulu 7mm) + `html/body/main` dinolkan margin & padding-nya saat cetak. Instruksi di layar kini menyebut **matikan "Headers and footers"** — header/footer bawaan dialog cetak memakan tinggi halaman dan itulah yang mendorong baris terakhir keluar.
- **🧾 Cetak/PDF daftar peserta — `/admin/event/[id]/cetak-peserta`**: halaman cetak (guard admin) berisi tabel peserta **dikelompokkan per kelas**, memakai **sumber data yang sama dengan ekspor CSV** (`getPesertaEkspor`, hanya status `diterima`) supaya kedua unduhan konsisten. PDF dihasilkan lewat `UnduhPdfBtn` → `window.print()` → "Save as PDF" (pola yang sama dengan sertifikat & stiker, **tanpa library PDF**). Print CSS: `thead{display:table-header-group}` agar judul kolom terulang tiap halaman, `tr{break-inside:avoid}` agar baris tak terpenggal. Tombol **🧾 PDF** ada di daftar event, bersebelahan dengan tombol ekspor CSV. Kolom: No · Nama Panggilan · Nama Lengkap · **L/P** · Tgl Lahir (Umur) · Orang Tua · Pendamping · Waktu Daftar. **Jenis kelamin** diambil dari `anak.jenis_kelamin` (nullable → ditampilkan `-`) dan ditambahkan di **`getPesertaEkspor`**, sehingga **PDF dan CSV ikut berubah bersamaan** — keduanya memang sengaja berbagi satu sumber data.
- **Endpoint**: `sertifikat`, `event`, `pendaftaran_event`, `anak` (nama panggilan).

> **Lintas-halaman**: `RekamAktivitas` (store/event/komunitas/pesanan/kelas-saya/pilih-anak/main/laporan) memanggil `catatAktivitas` → insert `aktivitas`. Fungsi `...Cached` di `publik.ts` memakai anon client + cache untuk `event`/`produk`/`kelas_bermain`.
> **Tombol kembali**: `components/TombolKembali.tsx` (client) — semua tombol "← Kembali" memakai riwayat browser (`router.back()`) dengan `fallback` href bila halaman dibuka langsung/di-refresh. Contoh: buka Riwayat Chat dari halaman rapor anak → Kembali balik ke rapor. Dipakai di seluruh halaman ber-tombol-kembali (user & admin detail). **Pengecualian: rapor bulanan** `/anak/[anakId]/rapor/[ym]` memakai `<Link>` **tetap** ke `/anak/[anakId]/laporan` — halaman itu punya deretan chip bulan, jadi `router.back()` memundurkan ke bulan sebelumnya alih-alih keluar dari rapor.

---

## 9. REST API internal (untuk aplikasi mobile)

Semua Route Handler (`app/api/**/route.ts`) mengembalikan amplop JSON seragam via helper `ok(data,status)` → `{ok:true,data}` dan `fail(msg,status)` → `{ok:false,error}`. Endpoint bisnis (selain `/api/auth/*`) memakai **Bearer token** via `getAuth(req)`: token dari header `Authorization: Bearer <access_token>`, divalidasi `auth.getUser()`, semua query ter-scope token → **RLS berlaku** (bukan service role). Path dinamis: `params: Promise<{id}>` (di-`await`).

### Auth (`anonClient()`, tanpa Bearer)
| Endpoint | File | Fungsi | Backend |
|---|---|---|---|
| `POST /api/auth/login` | `auth/login/route.ts` | validasi email+password → `signInWithPassword`; balikkan access/refresh token + user | `auth.signInWithPassword` |
| `POST /api/auth/register` | `auth/register/route.ts` | `signUp`; bila sesi langsung terbit, update `nama_tampilan`/`no_wa`; else `perlu_konfirmasi_email` | `auth.signUp`, `auth.setSession`, `profiles` (update) |
| `POST /api/auth/refresh` | `auth/refresh/route.ts` | tukar `refresh_token` → sesi baru | `auth.refreshSession` |

### Endpoint bisnis (Bearer)
| Endpoint | File | Ringkas | Backend |
|---|---|---|---|
| `GET /api/me` | `me/route.ts` | profil + status langganan (`statusLangganan()`) | `profiles`, `langganan` |
| `GET /api/anak` | `anak/route.ts` | daftar anak milik user | `anak` |
| `POST /api/anak` | `anak/route.ts` | tambah anak (validasi tgl lahir < hari ini, `mode_default` dari umur; **user non-aktif dibatasi `pengaturan_trial.trial_maks_anak`** → 403 bila lewat) | `anak`, `langganan`, `pengaturan_trial` |
| `GET /api/anak/[id]/catatan` | `anak/[id]/catatan/route.ts` | catatan perkembangan per anak (join judul event) | `catatan_perkembangan` (+`event`) |
| `GET /api/anak/[id]/gamifikasi` | `anak/[id]/gamifikasi/route.ts` | ringkasan gamifikasi anak (`getGamifikasiAnakDengan`) | `anak`, `hasil_main`, `lencana_anak`, `tantangan_kustom*` |
| `GET /api/pustaka` | `pustaka/route.ts` | pustaka game + `status_langganan` (`getPustakaDengan`) | `tema`, `paket_aset`, `video`, `langganan` |
| `POST /api/hasil-main` | `hasil-main/route.ts` | catat sesi main → koin/streak/lencana/tantangan (**inti bersama** `skor-core.ts` `catatHasilCore`, dipakai juga Server Action web `skor.ts`) | `hasil_main`, `anak`, `lencana_anak`, `tantangan_anak`, `tantangan_kustom*` |
| `GET /api/events` | `events/route.ts` | event `tampil`, urut tanggal | `event` |
| `GET /api/events/[id]` | `events/[id]/route.ts` | detail event (404 bila kosong) | `event` |
| `POST /api/events/[id]/daftar` | `events/[id]/daftar/route.ts` | daftar utk `anak_ids`; **total dihitung server** (harga×jumlah) | `event`, `anak`, `pendaftaran_event` (insert) |
| `GET /api/kelas-bermain` | `kelas-bermain/route.ts` | kelas `aktif` | `kelas_bermain` |
| `GET /api/kelas-bermain/[id]` | `kelas-bermain/[id]/route.ts` | detail kelas | `kelas_bermain` |
| `GET /api/produk` | `produk/route.ts` | produk `tampil` | `produk` |
| `GET /api/produk/[id]` | `produk/[id]/route.ts` | detail produk | `produk` |
| `GET /api/keranjang` | `keranjang/route.ts` | isi keranjang (join produk) + subtotal | `keranjang_item` (+`produk`) |
| `POST /api/keranjang` | `keranjang/route.ts` | tambah/ubah item (qty di-clamp stok, upsert manual) | `produk`, `keranjang_item` |
| `GET /api/pesanan` | `pesanan/route.ts` | daftar pesanan user | `pesanan` |
| `POST /api/pesanan` | `pesanan/route.ts` | checkout dari keranjang (subtotal server, status `menunggu_ongkir`, kosongkan keranjang) | `keranjang_item`, `pesanan`, `item_pesanan` |
| `GET /api/pesanan/[id]` | `pesanan/[id]/route.ts` | detail pesanan + item | `pesanan` (+`item_pesanan`) |

---

## 10. Infrastruktur & integrasi

### CI (GitHub Actions)
- **`.github/workflows/ci.yml`** — jalan di tiap **PR** dan **push ke `master`**: `npm ci` → `tsc --noEmit` → `npm test` (vitest) → `npm run build` (ESLint ikut). Node 20 + cache npm; `concurrency cancel-in-progress` per ref.
- Env Supabase dari **GitHub Secrets** (`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`) dengan fallback placeholder (build tak mengeksekusi query runtime).
- Deploy tetap otomatis via Vercel saat push `master`; disarankan aktifkan **branch protection** (require PR + check "CI / ci") sebelum tim bertambah.

### Supabase client (empat cara)
- `lib/supabase/server.ts` — `createClient()` async (anon), `@supabase/ssr` `createServerClient` + cookie SSR (`cookies()`; `setAll` di-try/catch). Untuk Server Component/halaman & reader/action.
- `lib/supabase/client.ts` — `createClient()` browser (anon, `createBrowserClient`). Untuk komponen client (upload dsb).
- `lib/api/helpers.ts` — untuk REST API mobile: client `@supabase/supabase-js` tanpa cookie, di-scope Bearer (anon).
- `lib/supabase/admin.ts` — **`createAdminClient()` service-role** (`import 'server-only'`, `persistSession:false`). **Bypass RLS**. HANYA untuk buat user (`buatUser`). Butuh `SUPABASE_SERVICE_ROLE_KEY`; throw pesan jelas bila kosong.

### `lib/api/helpers.ts`
- `ok(data,status=200)` / `fail(msg,status=400)` — amplop `Response.json`.
- `anonClient()` — client anon `persistSession:false` (login/register/refresh).
- `getAuth(req)` — ekstrak Bearer, client ber-header Authorization (RLS aktif), validasi `auth.getUser()`; balikkan `{supabase,user}` atau `{error,status}`.
- `isAuthErr(a)` — type guard hasil error `getAuth`.

### Storage
- **Satu bucket `aset`** untuk semua upload (client-side, pola `upload(path,file)` + `getPublicUrl`). Folder: `event/`, `produk/`, `worksheet/`, `artikel/`, `nota/` (WebP), `bukti/`, aset game.

### RPC
- **`laporan_engagement()`** (migrasi `0040_laporan_rpc.sql`) — `plpgsql` `SECURITY DEFINER` + guard `is_admin()`. Agregat dari `hasil_main`: `total_sesi`, `total_detik`, `mesin_populer`, `tema_populer`. Dipanggil di `/admin/laporan`. Alasan: agregasi di DB tanpa menarik semua baris.

### Integrasi eksternal
- **YouTube**: `lib/youtube.ts` (`youtubeId()` regex, util murni) + `components/YoutubeEmbed.tsx` (iframe `youtube-nocookie.com`). Satu-satunya URL eksternal dari klien.
- **TTS**: `lib/tts.ts` (`speak()` via Web Speech API browser, voice `id`). Tidak ada layanan jaringan.
- Tidak ada payment gateway / fetch host eksternal lain.

### Environment
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — wajib. **`SUPABASE_SERVICE_ROLE_KEY`** — opsional, server-only, hanya untuk fitur buat user (lihat §4 Buat User).

### 🌱 Environment: Produksi vs Beta (RENCANA — belum aktif)

Rancangan yang **sudah disetujui owner** untuk environment uji developer. Ditulis di sini sebagai rujukan; **kodenya belum dikerjakan** (lihat blok ⚠️ di bawah).

| | **Produksi (live)** | **Beta (developer)** |
|---|---|---|
| URL | `www.kidzplayful.com` | `beta.kidzplayful.com` |
| Branch Git | `master` | `beta` (permanen) |
| Scope env Vercel | Production | **Preview** (branch `beta`) |
| Proyek Supabase | proyek saat ini | **proyek kedua, terpisah** (DB & Auth sendiri) |
| Data | data nyata pelanggan | data uji, bebas dihapus |
| Akses | publik | dibatasi (Vercel **Deployment Protection**) |

**Kenapa proyek Supabase terpisah** (bukan satu DB dua skema): Auth, Storage, dan RLS ikut terisolasi, jadi percobaan di beta tidak bisa menyentuh akun/bukti bayar pelanggan. Konsekuensinya migrasi harus dijalankan **dua kali** (beta dulu, lalu produksi).

**Env var per scope** (nama key saja — nilainya diisi di dashboard Vercel, jangan pernah masuk repo):

| Key | Production | Preview (beta) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek prod | URL proyek beta |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key prod | anon key beta |
| `SUPABASE_SERVICE_ROLE_KEY` | service role prod | service role beta |
| `NEXT_PUBLIC_SITE_URL` | `https://www.kidzplayful.com` | `https://beta.kidzplayful.com` |

**Langkah setup (sekali jalan):**
1. **Supabase**: buat proyek kedua → SQL Editor → jalankan migrasi **`0001` s/d `0086` berurutan** (bucket `aset` + policy-nya ikut terbuat oleh `0007_storage_aset.sql`, tidak perlu dibuat manual).
2. **Auth** proyek beta → *URL Configuration*: Site URL & Redirect URLs ke `https://beta.kidzplayful.com` (termasuk `/reset-sandi`), plus `http://localhost:3000` untuk dev.
3. **Admin beta**: daftar akun biasa lewat UI beta, lalu di SQL Editor: `update public.profiles set is_admin = true, is_superuser = true where id = '<uuid>';` (peran tidak bisa diberikan dari UI karena trigger `cegah_self_admin`).
4. **Vercel**: isi 4 env var di scope **Preview** → tambah domain `beta.kidzplayful.com` dengan *Git Branch* = `beta` → aktifkan **Deployment Protection** untuk Preview.
5. **Git**: `git switch -c beta && git push -u origin beta` (branch permanen, jangan dihapus setelah merge).

**Alur kerja:** `feature/*` → PR ke **`beta`** (uji di `beta.kidzplayful.com`) → setelah lolos, merge `beta` → **`master`** (live).
**Aturan migrasi:** SQL dijalankan **di beta lebih dulu**, diverifikasi, baru di produksi. Migrasi tetap manual di kedua sisi.

> ⚠️ **Prasyarat teknis yang BELUM dikerjakan** — tanpa ini beta jalan tapi belum sehat:
> - **Base URL masih hardcode produksi di 9 titik**: `app/layout.tsx:14` (`metadataBase`) & `:34` (og `url`), `app/robots.ts:4`, `app/sitemap.ts:5`, `app/page.tsx:19`, `app/artikel/[slug]/page.tsx:14`, `app/coba/tema/[id]/page.tsx:8`, `app/coba/kelas/[id]/page.tsx:8`, `lib/profil.ts:8`. Akibatnya canonical/OG/sitemap di beta menunjuk ke domain live. Rencana: helper `src/lib/site.ts` (baca `NEXT_PUBLIC_SITE_URL`, fallback domain prod) lalu ganti ke-9 titik itu.
> - **Beta akan ter-index Google**: `app/robots.ts` mengembalikan `allow: '/'` tanpa syarat. Rencana: flag `IS_LIVE` → beta balas `disallow: '/'`. Sementara: andalkan **Deployment Protection**.
> - **Skrip `tools/*_check.mjs` menulis data uji ke DB PRODUKSI** (URL prod hardcode). Setelah beta ada, arahkan skrip ini ke beta.

---

## 11. Kamus tabel (data dictionary)

| Tabel | Kegunaan | Migrasi |
|---|---|---|
| `profiles` | akun + role (is_superuser/admin/guru/investor) + nama_tampilan/no_wa/alamat/pin_ortu | 0001, 0004, 0020, 0023, 0056 |
| `anak` | data anak (nama, `nama_panggilan` utk stiker, tgl lahir, jenis kelamin, mode, koin/streak) | 0001, 0024, 0042, 0071 |
| `langganan` | status langganan/trial per user (trial_mulai, aktif_sampai, nominal) | 0001 |
| `pembayaran_langganan` | riwayat pembayaran membership | 0052 |
| `tema`, `paket_aset` | katalog game (tema + paket/butir aset); `tema.sampul` = emoji/URL gambar; `paket_aset.mesin` ber-CHECK (perluas tiap mesin baru), `kategori_usia_id` FK; baca anon utk teaser publik (0081) | 0001–0003, 0025–0037, 0060, 0074, 0079, 0080, 0081 |
| `kategori_usia` | master rentang usia (nama, usia_min/max, urutan, aktif) → dropdown form Game & pengelompokan | 0079 |
| `video` | video edukasi (kategori baby/toddler); `boleh_trial` | 0003, 0005, 0060 |
| `kelas_bermain` | materi kelas bermain (+ worksheet, bahan; **`sampul_url` cover** (share Story/teaser/detail); `tujuan`/`usia_*`/`fokus_area[]`/`peran_ortu`; aktivitas jsonb ber-key `catatan_ortu`); `boleh_trial` | 0009, 0013–0016, 0060, 0076, 0077, 0083 |
| `fokus_area` | master Fokus Area Perkembangan (`key` unik → dipakai `kelas_bermain.fokus_area`, label, urutan, aktif) | 0078 |
| `favorit` | kelas favorit user | 0015 |
| `postingan`, `komentar`, `suka`, `laporan` | komunitas + moderasi | 0010, 0011, 0028 |
| `event`, `pendaftaran_event` | event + pendaftaran (status, bukti, kehadiran, reschedule, `alasan_tolak`; `indikator_perkembangan`; kelas terpisah `event.baby_*`/`toddler_*` + `pendaftaran_event.kelas`/`kelas_jadwal`; `event.harga_pendamping` + `pendaftaran_event.jumlah_pendamping`; **kuota `event.kuota_baby`/`kuota_toddler`/`kuota_gabungan` + RPC `kuota_terpakai_event`**; `pesan_reminder`) | 0017, 0027, 0062, 0069, 0070, 0075, 0085, 0086 |
| `catatan_perkembangan` | catatan tumbuh kembang per anak per event (`penilaian` array Area/Indikator/Nilai + `aspek` legacy) | 0020, 0062 |
| `sertifikat` | e-sertifikat per anak/event | 0026, 0034 |
| `produk`, `keranjang_item`, `pesanan`, `item_pesanan` | store (diskon persen, berat, `produk.terjual`, `pesanan.stok_terpotong`) | 0019, 0049, 0050, 0057 |
| `pengaturan_pembayaran` | konfig harga/rekening/QRIS/WA (per jenis transaksi) | 0038, 0051 |
| `artikel` | blog SEO | 0041 |
| `hasil_main` | hasil sesi game (skor, durasi, mesin, tema) | 0001, 0033, 0039 |
| `lencana_anak`, `tantangan_anak`, `tantangan_kustom`(+`_anak`) | gamifikasi (streak/badge/tantangan usia) | 0042–0045 |
| `aktivitas` | log buka menu/fitur (analitik, DAU/MAU) | 0046 |
| `feedback` | masukan/survey NPS | 0047, 0048 |
| `transaksi_keuangan` | ledger keuangan (single source of truth) | 0052 |
| `voucher`, `voucher_redeem` | master voucher diskon (kode, nominal/persen, jenis event/produk, kuota total & per-user, masa berlaku) + catatan redeem (1/transaksi, lepas saat tolak/batal); kolom `voucher_id`/`potongan_voucher` di `pendaftaran_event`/`pesanan` | 0084 |
| `aset` | aset perusahaan (keuangan) | 0052 |
| `kategori_aset`, `kategori_pengeluaran` | master kategori | 0053, 0055 |
| `anggaran` | budget per bulan & kategori | 0054 |
| `sponsor`, `sponsorship` | modul sponsor (perusahaan + deal/invoice/pembayaran inline) | 0058 |
| `pengaturan_trial` | izin akses trial (batas anak, toggle Komunitas) — akses fitur per item via `boleh_trial` | 0059, 0061 |
| `pengaturan_menu` | Akses Menu (`akses` jsonb) + Akses Fitur rekomendasi (`fitur` jsonb `{guru,psikolog}`), single-row id=1 | 0063, 0067 |
| `jadwal_psikolog` | jam buka + kuota + durasi konsultasi per psikolog (`nama`, `hari_buka int[]`, `maks_per_hari`, `durasi_menit`, `aktif`) | 0065, 0072 |
| `pendaftaran_konsultasi` | booking konsultasi = kontainer sesi chat (`status` menunggu/diterima/ditolak/selesai/batal; `jam` terpilih; `dimulai_pada`+`durasi_menit` utk timer) | 0065, 0072, 0073 |
| `pesan_konsultasi` | pesan chat konsultasi (`pengirim_id`, `teks`, `dibaca_at`) | 0065 |
| `rekomendasi_psikolog` | rekomendasi ("resep") psikolog per anak (`isi`, `butir jsonb`) | 0065 |
| `rekomendasi_item` | rekomendasi produk/event/materi dari psikolog/guru (`jenis`, `ref_id`) | 0067 |
| `riwayat_kelas` | riwayat materi kelas yang dibuka | 0018 |

---

## 12. Alur penting

- **Pencatatan pendapatan (basis kas)**: pemasukan tercatat ke `transaksi_keuangan` saat admin **memverifikasi** — pesanan store (subtotal), pendaftaran event "diterima" (total), aktivasi langganan (nominal). Pembatalan meng-offset via `hapusLedgerRef`. Semua via `ledger.ts` (try/catch aman).
- **Checkout store**: keranjang → `POST /api/pesanan` atau server action `checkout` → `pesanan` (menunggu_ongkir) + `item_pesanan`, keranjang dikosongkan. Admin isi ongkir → user upload bukti → admin verifikasi (kurangi stok + catat ledger).
- **Gamifikasi**: `catatHasil` menyimpan `hasil_main`, memutakhirkan koin/streak `anak`, mengevaluasi `lencana_anak` & tantangan (`tantangan_anak`, `tantangan_kustom_anak`).
- **Keamanan role**: perubahan role hanya lewat `/admin/users` (guard super user/admin) + trigger `cegah_self_admin` yang membekukan kolom role untuk yang tak berwenang.

---

## 13. Diagram alur

### 13.1 Arsitektur tinggi
```
┌─────────────┐   ┌──────────────────────────────────────┐   ┌──────────────┐
│  Pengguna   │   │            Next.js 16 (Vercel)        │   │   Supabase   │
│  browser /  │   │                                       │   │              │
│  app mobile ├──▶│  Server Components ──▶ lib/data/*.ts   ├──▶│  Postgres    │
│             │   │  Server Actions   ──▶ *-actions.ts     │   │  + RLS       │
│             │   │  Route Handlers   ──▶ /api/** (Bearer) │   │  + Auth      │
│             │◀──┤  Client Components ─▶ upload storage    │◀──┤  + Storage   │
└─────────────┘   └──────────────────────────────────────┘   └──────────────┘
        │                                                            ▲
        └──── klien: signInWithPassword / signUp / upload aset ──────┘
   Sebagian besar query pakai ANON KEY + RLS. Guard aplikasi (is_admin/is_superuser/…)
   + fungsi SQL is_admin() dipakai di kebijakan RLS. Service-role key hanya
   untuk buat user (lib/supabase/admin.ts, server-only).
```

### 13.2 Auth & routing masuk
```
Login (/login) ─signInWithPassword─▶ cek profiles (is_admin/is_superuser/is_guru/is_psikolog)
      │                                      │
      │             is_admin/is_superuser? ──┼── ya ──▶ /admin  (panel admin)
      │                             is_guru? ├── ya ──▶ /guru  (area guru)
      │                          is_psikolog?├── ya ──▶ /psikolog (area psikolog)
      │                                      └── tidak ─▶ /pilih-anak (ortu)
   (admin/superuser/psikolog yang mendarat di /pilih-anak → redirect ke areanya)
Daftar (/daftar) ─signUp─▶ (trigger DB buat profiles+langganan trial)
                          └─▶ update nama_tampilan, no_wa
Guard halaman:
  /admin (layout) → getAksesAdmin()          (hitung menu per role; else /pilih-anak)
  /admin/<menu>   → src/proxy.ts blokir menu di luar akses role → /admin
  /admin/akses-menu → getSuperuserTerjamin() (khusus super user)
  /admin/users    → getPengelolaUserTerjamin() (is_admin ATAU is_superuser)
  /investor       → getInvestorTerjamin()     (is_investor / is_admin)
  /main,/ortu,/pilih-game → getAnakTerjamin() (login + milik anak; BUKAN langganan —
                            status langganan hanya mengunci item, lihat §9)
```

### 13.3 Checkout store → pendapatan (basis kas)
```
User: tambah ke keranjang ──▶ keranjang_item
      │
      ▼  checkout (server action / POST /api/pesanan)
   pesanan (status: menunggu_ongkir) + item_pesanan   ← subtotal dihitung server
   keranjang dikosongkan
      │
      ▼  Admin /admin/pesanan
   setOngkir ─▶ status: menunggu_bayar
      │
      ▼  User /pesanan/[id]: upload bukti (storage 'aset') → uploadBuktiPesanan
      ▼  Admin: verifikasiPesanan
   status: diproses  +  produk.stok dikurangi
        └─▶ catatLedger(masuk, kategori 'store', jumlah = SUBTOTAL, ref pesanan)
              (ongkir BUKAN pendapatan)                    │
   (jika dibatalkan → ubahStatusPesanan 'batal' → hapusLedgerRef)
                                                           ▼
                                                  transaksi_keuangan
```

### 13.4 Pendaftaran event → pendapatan + sertifikat
```
User /event/[id]/daftar: pilih anak + upload bukti ─▶ daftarEvent
   pendaftaran_event (status: menunggu, total = harga × jumlah anak)
      │
      ▼  Admin /admin/event/[id]/pendaftar
   setStatusPendaftaran('diterima')
      ├─▶ pendaftaran_event.diverifikasi_pada = now
      └─▶ catatLedger(masuk, kategori 'event', jumlah = TOTAL, ref pendaftaran)
   setKehadiran(hadir_anak_ids)   (untuk sertifikat)
      │
      ▼  generateSertifikatEvent ─▶ sertifikat (upsert per anak)
            └─▶ user lihat di /sertifikat/[id] + /anak/[anakId]/laporan
   (ditolak → hapusLedgerRef)
```

### 13.5 Langganan → pembayaran, ledger, & pengingat WA
```
User transfer/QRIS ──▶ Admin /admin/langganan : Aktifkan (AktifkanForm)
   aktifkanLangganan(ortuId, nominal, via)
      ├─▶ langganan.aktif_sampai += 1 bulan
      ├─▶ pembayaran_langganan (insert riwayat)
      └─▶ catatLedger(masuk, kategori 'membership', jumlah = nominal, ref langganan)
                                                      │
   Jatuh tempo ≤ 7 hari / lewat:                      ▼
   /admin/langganan seksi "Perlu diingatkan"   transaksi_keuangan
      └─▶ tombol WA (linkWa ke no_wa member, pesan otomatis)
```

### 13.6 Ledger keuangan = single source of truth
```
        SUMBER PEMASUKAN                         PENGELUARAN/ASET (manual)
  verifikasi pesanan (store) ─┐        ┌── catatPengeluaran (expense)
  terima pendaftaran (event) ─┼─▶      │   simpanAset (opsi kas keluar)
  aktivasi langganan (member)─┘        └──────────────┐
                    │                                  │
                    ▼                                  ▼
              ┌──────────────────────────────────────────┐
              │            transaksi_keuangan             │  (append-only ledger)
              └──────────────────────────────────────────┘
                    │            │            │            │
        ┌───────────┘     ┌──────┘      ┌─────┘       ┌────┘
        ▼                 ▼             ▼             ▼
   Dashboard CEO     KPI (kpi.ts)  Insight/BI    Laporan/Pajak
   getDashboard      MRR/churn/    tren/mix/      P&L, omzet,
   Keuangan()        LTV/CAC/...   cohort/top     PPh 0,5%
        │                                              ▲
        └──────────────▶ Investor /investor ──────────┘
   Anggaran (anggaran.ts): getBudgetMap → info sisa budget di form
   Expense & Aset; getForecast → proyeksi kas 6 bulan.
```

### 13.7 Gamifikasi (mode anak main game)
```
/main/[anakId] ─▶ GameRunner ─selesai─▶ catatHasil (skor.ts)
   ├─▶ hasil_main (insert sesi: skor, durasi, mesin, tema)
   ├─▶ anak: koin += , streak (harian) diperbarui
   ├─▶ lencana_anak (evaluasi & beri lencana)
   └─▶ tantangan_anak / tantangan_kustom_anak (progres tantangan usia)
          │
          ▼  ditampilkan di /anak/[anakId]/laporan (getGamifikasiAnak)
```

### 13.8 Peran role & proteksi eskalasi
```
Super User ──atur──▶ [Super User] [Admin] [Guru] [Investor] [Psikolog]
Admin      ──atur──▶                       [Guru] [Investor] [Psikolog]
                     ▲ role tinggi hanya oleh Super User
Trigger cegah_self_admin (DB):
  bukan superuser  → is_admin & is_superuser DIBEKUKAN
  bukan admin/super→ is_guru & is_investor & is_psikolog DIBEKUKAN
  ⇒ user biasa tak bisa menaikkan role dirinya (mis. is_investor)
```

> Diagram sengaja memakai ASCII agar selalu ter-render di PDF (`tools/md2pdf.py`) maupun GitHub tanpa dependency. Bila kelak ingin diagram Mermaid interaktif, template `md2pdf.py` perlu menyuntik `mermaid.js` + Chrome `--virtual-time-budget`.
