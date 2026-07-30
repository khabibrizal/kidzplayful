# Dokumentasi Developer — KidzPlayful

> Panduan teknis untuk developer baru. Menjelaskan **per halaman/menu**: file apa yang menanganinya, function/reader/server-action apa yang dipakai, dan **endpoint backend** (tabel Supabase / RPC / storage / auth) yang disentuh. Termasuk **REST API internal** (untuk aplikasi mobile) dan infrastruktur.

Terakhir diperbarui: 2026-07-24.

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
    domain/            # logika murni (trial, gamifikasi, harga, laporan, usia…)
    supabase/          # server.ts (SSR), client.ts (browser)
    api/               # helpers.ts (amplop JSON + auth Bearer untuk REST API)
    game/              # tipe & util mesin game
supabase/migrations/   # skema DB (0001..0086), dijalankan manual di SQL Editor
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
- **Halaman admin**: `admin/layout.tsx` memakai **`getAksesAdmin()`** (`lib/data/admin.ts`) → hitung menu yang boleh per role (matriks Akses Menu, lihat §4 Akses Menu); redirect `/pilih-anak` bila tak punya akses menu apa pun. Super user = semua. `getAdminTerjamin()` (is_admin/superuser) masih dipakai halaman non-menu (mis. stiker). `/admin/akses-menu` pakai `getSuperuserTerjamin()`. Halaman anak: `getAnakTerjamin()`. Investor: `getInvestorTerjamin()`.
- **Routing login**: setelah login → **admin/superuser ke `/admin`**, guru ke `/guru`, lainnya `/pilih-anak` (`login/page.tsx`); admin/superuser yang mendarat di `/pilih-anak` di-redirect ke `/admin`.
- **Enforcement rute**: `src/proxy.ts` (middleware) memblokir user membuka `/admin/<menu>` yang tak diizinkan role-nya → redirect `/admin`.
- **Server action**: setiap file `*-actions.ts` mengulang cek admin sendiri lewat helper lokal (`adminDb()` / `db()` / `pengelola()`) → `auth.getUser()` + baca `profiles.is_admin`.

### Data layer
- **Reader** (baca) ada di `lib/data/<fitur>.ts`, memakai `createClient()` dari `@/lib/supabase/server`.
- **Server action** (tulis) ada di `lib/data/<fitur>-actions.ts` dengan `'use server'` + guard.
- Halaman tidak menaruh selector mentah bila bisa lewat reader; beberapa halaman melakukan query inline sederhana.

### Deploy & migrasi
- Migrasi dijalankan **manual** di Supabase SQL Editor (urut `0001..0086`), lalu diverifikasi via REST (`?select=col&limit=1` → 200).
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
- **Penegakan**: `daftarEvent` menolak dengan pesan **"Mohon maaf, kuota sudah penuh. Terima kasih 🙏"** bila sisa 0, atau **"kuota tersisa hanya N anak"** bila anak yang dipilih melebihi sisa. Sisi user (`DaftarForm`): label sisa kuota per opsi kelas, banner merah bila penuh, dan tombol Daftar dinonaktifkan.
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
- **Grup kelas bisa dilipat (expand/collapse)**: header tiap kelas jadi tombol (▾/▸) berisi label + jumlah peserta + sisa kuota; ada tombol **⊟ Tutup semua / ⊞ Buka semua**. Saat kolom **pencarian terisi**, semua grup **dipaksa terbuka** agar hasil pencarian tetap terlihat walau kelasnya tadi ditutup (header juga menampilkan badge `N hasil`). Grup tanpa hasil tetap disembunyikan.
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

### 🎈 Kelas Bermain — `/admin/kelas-bermain`
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
- **Bagikan ke Story**: opsi **"📸 Bagikan ke Story"** di `ShareButton` (menu kini SELALU terbuka saat diklik → native share jadi item "📱 Bagikan…" agar opsi Story terjangkau di HP). `lib/story-card.ts` `buatKartuStory()` menggambar kartu **canvas 1080×1920** (brand + gambar konten + judul via `bungkusTeks` + CTA + teks URL; gambar `crossOrigin='anonymous'`, gagal→kartu tanpa gambar). HP: `navigator.share({files:[png]})` → user pilih Instagram → posting Story (+ link sticker manual); desktop: unduh PNG. Prop `gambar` dari artikel (`sampul_url`) & tema (`sampul`); kelas = kartu brand. Atribusi `utm_medium=story` (label "Instagram Story"). Tanpa migrasi.

### 📺 Video — `/admin/video`
- **File**: `admin/video/page.tsx` (query + hapus/toggle inline) → `VideoForm.tsx`.
- **Server action**: `buatVideo`, `hapusVideo`, **`setBolehTrialVideo`** (toggle Trial ✓/✗) (`admin-konten.ts`); parse YouTube ID via `ekstrakYoutubeId`.
- **Endpoint**: `video` (+`boleh_trial`).

### 💳 Langganan — `/admin/langganan`
- **File**: `admin/langganan/page.tsx` (query inline + `Pager.tsx`) → `AktifkanForm.tsx`. Util `@/lib/domain/trial` (`statusLangganan`), `@/lib/format` (`linkWa`), `@/lib/metode` (`METODE_BAYAR`).
- **Fungsi data**: query inline `profiles` (member + embed anak & langganan) & `langganan` (jatuh tempo ≤ 7 hari untuk tombol WA pengingat); `getPengaturanBayar()` (nominal default).
- **Server action**: `aktifkanLangganan` (`admin-bisnis.ts`).
- **Endpoint**: `profiles`, `langganan`, `pengaturan_pembayaran`; `aktifkanLangganan` → `langganan` (update +1 bln), `pembayaran_langganan` (insert), `catatLedger` (kategori `membership`).

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
- **Fungsi data**: `getLedger({arah:'keluar'})`, `getKategoriPengeluaran()`, `getBudgetMap(ym)` (sisa anggaran per kategori).
- **Server action**: `catatPengeluaran`, `hapusTransaksi` (`keuangan-actions.ts`).
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

### 👶 Ortu & Anak — `/pilih-anak`, `/anak/[anakId]`, `/ortu/[anakId]`, `/pengaturan`
- **Fungsi data**: `getEventTampilCached()`, `getStatusPendaftaranSaya()`, `getArtikelTerbit({limit:3})`, `getPengaturanBayar()`; sisanya inline.
- **Server action**: `tambahAnak` (`pilih-anak/actions.ts`), `updateAnak`/`setBatas`/`hapusAnak`/`simpanProfilPengiriman`/`setPin` (`ortu-actions.ts`), `setNamaTampilan` (`komunitas-actions.ts`), `kirimFeedback` (`feedback-actions.ts`).
- **Nama panggilan** (0071): form Tambah Data Anak & Kelola Anak (`KelolaAnak.tsx`) punya input `nama_panggilan` (opsional) — dipakai a.l. **stiker event** (fallback: kata pertama nama lengkap).
- **Endpoint**: `anak` (+`nama_panggilan`), `langganan`, `profiles`, `hasil_main`, `event`, `pendaftaran_event`, `artikel`, `feedback`, `aktivitas`.

#### 📊 Laporan perkembangan anak — `/anak/[anakId]/laporan`
- **File**: `anak/[anakId]/laporan/page.tsx` (guard login + kepemilikan anak).
- **Badan laporan**: **`<LaporanAnakView anakId>`** (`components/`) — dipakai bersama sisi psikolog. Berisi statistik main, lencana & streak, latihan per area, waktu per game, dan blok **KEGIATAN (EVENT)** (gabungan `getCatatanAnak` + `getSertifikatAnak` per event, `<CatatanCard>`). Data: `hasil_main` + `laporanAnak()` (`domain/laporan-anak`) + `getGamifikasiAnak()`.
- **🧠 Konsultasi Psikolog**: `getKonsultasiAnak(anakId)` (`konsultasi.ts`) → **`<RiwayatKonsultasi>`** — daftar konsultasi **di-group per tanggal** (collapsible). Klik konsultasi → `/konsultasi/[id]` (riwayat chat + rekomendasi psikolog + rekomendasi produk/event/materi khusus sesi itu).
- **🎁 Rekomendasi dari Kelas/Guru**: rekomendasi tanpa sesi konsultasi (`pendaftaran_id` null, mis. diberi guru saat kelas) → `<RekomendasiCard>` + `<RekomendasiItemList>` (hanya tampil bila ada).
- **Endpoint**: `anak`, `hasil_main`, `catatan_perkembangan`, `sertifikat`, gamifikasi (`lencana_anak`/`tantangan_kustom*`), `pendaftaran_konsultasi`, `rekomendasi_psikolog`, `rekomendasi_item`.

### 🎮 Game — `/pilih-game/[anakId]`, `/main/[anakId]`
- **Guard**: `getAnakTerjamin(anakId)` (`anak.ts`) — login + langganan + kepemilikan.
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

### 🍎 Guru — `/guru`, `/guru/[eventId]` (isi Nilai tumbuh kembang), `/catatan/[eventId]`
- **Guard**: `getGuruTerjamin()` (`guru.ts`).
- **Fungsi data**: `getEventUntukGuru()`, `getPesertaEvent(eventId)` (`guru.ts`), `getEvent()`/`getCatatanEventSaya()` (`event.ts`/`catatan.ts`).
- **Server action**: `simpanCatatan` (`guru-actions.ts`, upsert) — di-gate izin fitur **`nilai`** (form disembunyikan bila off; `pengisi()` menolak di server).
- **Rekomendasi item**: `GuruNilai.tsx` juga menampilkan `<RekomendasiItemPicker>` per peserta (produk/event/materi, izin via Akses Fitur `fiturUntukRole({is_guru,is_admin})`).
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

### 🧠 Konsultasi (customer) — `/konsultasi`, `/konsultasi/[pendaftaranId]`
Sisi orang tua; **khusus member `aktif`** (gate `getStatusLangganan` → `<Terkunci fitur="Konsultasi Psikolog">`, pola Komunitas).
- **Fungsi data** (`konsultasi.ts`): `getPsikologTersedia()` (dari `jadwal_psikolog` aktif), `getAnakSaya()`, `getKonsultasiSaya()`, `getKonsultasiAnak()`, `getPesan()`, `getRekomendasiAnak()`.
- **Server action** (`konsultasi-actions.ts`, dipakai ortu & psikolog): `daftarKonsultasi` (via RPC `daftar_konsultasi` — enforce hari buka + **jam dalam window jadwal** + kuota harian + cegah booking ganda), `kirimPesan` (gate izin `chat` bila pengirim psikolog), `tandaiDibaca`, `batalKonsultasi`, `selesaikanKonsultasi` (auto-selesai timer).
- **Booking dibatasi jadwal** (0073): `BookingForm.tsx` — **tanggal = dropdown hari buka saja** (30 hari ke depan dari `hari_buka`), **jam = dropdown slot** per `durasi_menit` dalam window `jam_mulai–jam_selesai` (atau input time ber-min/max bila durasi 0). Jam tersimpan di `pendaftaran_konsultasi.jam` dan divalidasi ulang di RPC (`p_jam`) — tak bisa memilih di luar jadwal psikolog.
- **Halaman**: `/konsultasi` (`BookingForm.tsx` + **daftar sesi di-group per tanggal** collapsible, tampilkan 🕐 jam + `BatalBtn.tsx`); `/konsultasi/[id]` (chat ber-timer + rekomendasi psikolog + rekomendasi item, **difilter per `pendaftaran_id` sesi**; sesi `selesai` → read-only "Riwayat chat").
- **Endpoint**: `jadwal_psikolog`, `anak`, `pendaftaran_konsultasi`, `pesan_konsultasi`, `rekomendasi_psikolog`, `rekomendasi_item`; RPC `daftar_konsultasi`/`sisa_kuota_konsultasi`.

### 📈 Investor — `/investor`
- **Guard**: `getInvestorTerjamin()` (`investor.ts`). `robots: noindex`.
- **Fungsi data**: `getDashboardKeuangan()`, `getPerBulan(6)` (`keuangan.ts`).
- **Endpoint**: `profiles`, `transaksi_keuangan`, `langganan` (+ sumber lain via dashboard keuangan).

### 🏅 Sertifikat & Stiker — `/sertifikat/[id]`, `/stiker-event/[id]`
- **Fungsi data**: `getSertifikat(id)` (`sertifikat.ts`); stiker (**guard admin** `getAdminTerjamin`): `getEventAdmin(id)`, `getPendaftaranByEvent(id)`.
- **Komponen**: `SertifikatView`, `StikerSheet`, `UnduhPdfBtn`.
- **Nama di stiker**: memakai **`anak.nama_panggilan`** (fallback: kata pertama nama lengkap) — join `anak` per `anak_ids` pendaftaran.
- **Endpoint**: `sertifikat`, `event`, `pendaftaran_event`, `anak` (nama panggilan).

> **Lintas-halaman**: `RekamAktivitas` (store/event/komunitas/pesanan/kelas-saya/pilih-anak/main/laporan) memanggil `catatAktivitas` → insert `aktivitas`. Fungsi `...Cached` di `publik.ts` memakai anon client + cache untuk `event`/`produk`/`kelas_bermain`.
> **Tombol kembali**: `components/TombolKembali.tsx` (client) — semua tombol "← Kembali" memakai riwayat browser (`router.back()`) dengan `fallback` href bila halaman dibuka langsung/di-refresh. Contoh: buka Riwayat Chat dari halaman rapor anak → Kembali balik ke rapor. Dipakai di seluruh halaman ber-tombol-kembali (user & admin detail).

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
  /main,/ortu,/pilih-game → getAnakTerjamin() (login+langganan+milik anak)
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
