# Dokumentasi Developer — KidzPlayful

> Panduan teknis untuk developer baru. Menjelaskan **per halaman/menu**: file apa yang menanganinya, function/reader/server-action apa yang dipakai, dan **endpoint backend** (tabel Supabase / RPC / storage / auth) yang disentuh. Termasuk **REST API internal** (untuk aplikasi mobile) dan infrastruktur.

Terakhir diperbarui: 2026-07-09.

---

## 1. Ringkasan & Stack

- **Framework**: Next.js 16 (App Router, Server Components + Server Actions).
- **Bahasa**: TypeScript. Semua kode/komentar/UI berbahasa Indonesia.
- **Backend**: Supabase (Postgres + Row Level Security + Auth + Storage).
- **Hosting**: Vercel (`www.kidzplayful.com`).
- **Tanpa build/lint khusus**: gerbang mutu = `npx tsc --noEmit` + `npm run build`.
- **Tanpa service-role key**: SEMUA akses backend memakai **anon key + RLS**. Operasi admin diamankan lewat guard aplikasi + RLS + fungsi SQL `is_admin()`/`is_guru()`/`is_investor()`/`is_superuser()`. Satu-satunya bypass RLS: RPC `laporan_engagement()` (SECURITY DEFINER, ber-guard `is_admin()`).

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
supabase/migrations/   # skema DB (0001..0056), dijalankan manual di SQL Editor
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
- **Halaman**: `getAdminTerjamin()` (`lib/data/admin.ts`) dipakai di `admin/layout.tsx` → redirect `/login` atau `/pilih-anak` bila bukan admin. Halaman `/admin/users` memakai guard khusus `getPengelolaUserTerjamin()` (admin **atau** super user). Halaman anak memakai `getAnakTerjamin()` (login + langganan + kepemilikan). Investor: `getInvestorTerjamin()`.
- **Server action**: setiap file `*-actions.ts` mengulang cek admin sendiri lewat helper lokal (`adminDb()` / `db()` / `pengelola()`) → `auth.getUser()` + baca `profiles.is_admin`.

### Data layer
- **Reader** (baca) ada di `lib/data/<fitur>.ts`, memakai `createClient()` dari `@/lib/supabase/server`.
- **Server action** (tulis) ada di `lib/data/<fitur>-actions.ts` dengan `'use server'` + guard.
- Halaman tidak menaruh selector mentah bila bisa lewat reader; beberapa halaman melakukan query inline sederhana.

### Deploy & migrasi
- Migrasi dijalankan **manual** di Supabase SQL Editor (urut `0001..0056`), lalu diverifikasi via REST (`?select=col&limit=1` → 200).
- Commit: `git -c commit.gpgsign=false commit` + baris `Co-Authored-By`. Push ke `master` → Vercel auto-deploy.
- Banyak reader dibungkus `try/catch` agar fitur aman dideploy sebelum migrasinya dijalankan (mengembalikan nilai default).

### Storage
- **Satu bucket: `aset`**. Upload dilakukan **client-side** (komponen client), lalu URL publik disimpan lewat server action. Folder: `event/`, `produk/`, `worksheet/`, `artikel/`, `nota/`, `bukti/`, dan aset game.

### Environment
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — hanya dua env var ini yang direferensikan seluruh `src`. Tidak ada service-role key / kunci pihak ketiga.

---

## 4. Panel Admin — per menu (non-keuangan)

Pembungkus: `admin/layout.tsx` (guard `getAdminTerjamin`) + `AdminNav.tsx` (navigasi) + `LogoutBtn.tsx`.

### 🏠 Dashboard (Tema) — `/admin`
- **File**: `admin/page.tsx` (server, form inline).
- **Server action**: `buatTema`, `setMingguIni`, `hapusTema` (`admin-konten.ts`).
- **Endpoint**: `tema` (select/insert/update/delete).

### 📈 Analitik — `/admin/analitik`
- **File**: `admin/analitik/page.tsx` (query inline).
- **Fungsi data**: `getAktivitasRingkas()` (`aktivitas.ts`) — fitur populer + user aktif hari ini.
- **Endpoint**: `anak`, `hasil_main`, `pendaftaran_event`, `pesanan`, `postingan`, `komentar`, `profiles`, `aktivitas`.

### 🗓️ Event — `/admin/event`
- **File**: `admin/event/page.tsx` → `EventAdmin.tsx` (+ `PanelSertifikat`).
- **Fungsi data**: `getEventSemua()`, `getJumlahPendaftar()` (`admin-event.ts`).
- **Server action**: `buatEvent`, `updateEvent`, `toggleStatusEvent`, `hapusEvent`, `simpanBerkasSertifikat` (`admin-event-actions.ts`); `generateSertifikatEvent` (`admin-sertifikat-actions.ts`).
- **Endpoint**: `event`, `pendaftaran_event`, `sertifikat` (upsert), `storage.from('aset')` (folder `event/`, `event/sertifikat-*`, `event/stiker-*`).

### 🗓️ Pendaftar Event — `/admin/event/[id]/pendaftar`
- **File**: `admin/event/[id]/pendaftar/page.tsx` → `PendaftarAdmin.tsx`.
- **Fungsi data**: `getEventAdmin(id)`, `getPendaftaranByEvent(id)`, `getSertifikatMapByEvent(id)`, `getEventSemua()` (`admin-event.ts`).
- **Server action**: `setStatusPendaftaran`, `setKehadiran`, `reschedulePendaftaran` (`admin-event-actions.ts`).
- **Endpoint**: `event`, `pendaftaran_event`, `sertifikat`; `setStatusPendaftaran` → `catatLedger`/`hapusLedgerRef` ke `transaksi_keuangan` (pendapatan event saat status "diterima").

### 🛍️ Produk — `/admin/produk`
- **File**: `admin/produk/page.tsx` → `ProdukAdmin.tsx`.
- **Fungsi data**: `getProdukSemua()` (`admin-store.ts`).
- **Server action**: `buatProduk`, `updateProduk`, `hapusProduk` (`admin-store-actions.ts`).
- **Endpoint**: `produk`; `storage.from('aset')` (folder `produk/`).

### 📦 Pesanan — `/admin/pesanan`
- **File**: `admin/pesanan/page.tsx` (+ `Pager.tsx`) → `PesananAdmin.tsx`.
- **Fungsi data**: `getPesananSemua(hal)` (`admin-store.ts`, 20/hal + item).
- **Server action**: `setOngkir`, `verifikasiPesanan`, `setResi`, `ubahStatusPesanan` (`admin-store-actions.ts`).
- **Endpoint**: `pesanan`, `item_pesanan`, `produk` (kurangi stok saat verifikasi); `verifikasiPesanan` → `catatLedger` (kategori `store`, jumlah=subtotal); `batal` → `hapusLedgerRef`.

### 🎈 Kelas Bermain — `/admin/kelas-bermain`
- **File**: `admin/kelas-bermain/page.tsx` → `KelasAdmin.tsx`.
- **Fungsi data**: `getKelasSemua()` (`kelas-bermain.ts`), `getProdukSemua()` (`admin-store.ts`).
- **Server action**: `buatKelas`, `updateKelas`, `toggleStatusKelas`, `hapusKelas` (`kelas-bermain-actions.ts`).
- **Endpoint**: `kelas_bermain`, `produk`; `storage.from('aset')` (folder `worksheet/`).

### 📝 Artikel — `/admin/artikel` & `/admin/artikel/[id]`
- **File**: `admin/artikel/page.tsx` (daftar) + `admin/artikel/[id]/page.tsx` → `ArtikelForm.tsx`.
- **Fungsi data**: `getArtikelSemua()`, `getArtikelById(id)` (`artikel.ts`).
- **Server action**: `buatArtikel`, `simpanArtikel`, `hapusArtikel` (`artikel-admin.ts`).
- **Endpoint**: `artikel`; `storage.from('aset')` (folder `artikel/`). Util `@/lib/slug`.

### 📺 Video — `/admin/video`
- **File**: `admin/video/page.tsx` (query + hapus inline) → `VideoForm.tsx`.
- **Server action**: `buatVideo`, `hapusVideo` (`admin-konten.ts`); parse YouTube ID via `ekstrakYoutubeId`.
- **Endpoint**: `video`.

### 💳 Langganan — `/admin/langganan`
- **File**: `admin/langganan/page.tsx` (query inline + `Pager.tsx`) → `AktifkanForm.tsx`. Util `@/lib/domain/trial` (`statusLangganan`), `@/lib/format` (`linkWa`), `@/lib/metode` (`METODE_BAYAR`).
- **Fungsi data**: query inline `profiles` (member + embed anak & langganan) & `langganan` (jatuh tempo ≤ 7 hari untuk tombol WA pengingat); `getPengaturanBayar()` (nominal default).
- **Server action**: `aktifkanLangganan` (`admin-bisnis.ts`).
- **Endpoint**: `profiles`, `langganan`, `pengaturan_pembayaran`; `aktifkanLangganan` → `langganan` (update +1 bln), `pembayaran_langganan` (insert), `catatLedger` (kategori `membership`).

### 🧒 Anak & Gamifikasi — `/admin/anak`
- **File**: `admin/anak/page.tsx` → `AnakGamiForm.tsx`. Konstanta `LENCANA` (`domain/gamifikasi`).
- **Fungsi data**: `getAnakUntukAdmin()` (`admin-anak.ts`) — anak + koin/streak/lencana + email ortu.
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

### 👤 Pengguna & Role — `/admin/users`
- **File**: `admin/users/page.tsx` (form inline; toggle role `<form action={setRole}>`).
- **Fungsi data**: `getPengelolaUserTerjamin()` (guard + status superuser), `getDaftarUser(q)` (`admin-users.ts`).
- **Server action**: `setRole(formData)`, `tambahUserRole(formData)` (`admin-users-actions.ts`).
- **Endpoint**: `profiles` (baca role + update kolom role; super user otomatis set `is_admin`).
- **Guard/Role**: `getPengelolaUserTerjamin()` (admin **atau** super user). Role tinggi (admin/superuser) hanya bisa diatur super user; tak bisa cabut super user dari diri sendiri.

### 📣 Reminder Event — `/admin/reminder`
- **File**: `admin/reminder/page.tsx` → `ReminderAdmin.tsx`. Util `formatTanggal`, `linkWa`.
- **Fungsi data**: `getReminderPendaftaran()` (`admin-reminder.ts`) — pendaftaran "diterima" + event + ortu (no_wa).
- **Server action**: `tandaiReminder(pendaftaranId, terkirim)` (`admin-reminder-actions.ts`).
- **Endpoint**: `pendaftaran_event` (+ embed `event`, `ortu`).

### 🎨 Kelola Tema — `/admin/tema/[id]`
- **File**: `admin/tema/[id]/page.tsx` (query + aksi inline) → `PaketForm.tsx` (+ `TargetEditor`, `@/components/admin/AsetInput`, `@/components/game/Aset`).
- **Server action**: `hapusPaket`, `setStatusTema`, `setMingguIni`, `buatPaket`, `updatePaket` (`admin-konten.ts`, validasi `validasiButir`).
- **Endpoint**: `tema`, `paket_aset`; `storage.from('aset')` (aset game via AsetInput).

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
- **Endpoint**: `transaksi_keuangan`, `kategori_pengeluaran`; detail bercabang ke `pesanan`(+`item_pesanan`), `pendaftaran_event`(+`event`), `pembayaran_langganan`, `profiles`.

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
| `langganan-status.ts` | `getStatusLangganan(s,userId)` | `langganan` |
| `investor.ts` | `getInvestorTerjamin()` (guard) | `profiles` |

### Hook pencatat ledger (basis kas)
- `admin-store-actions.ts` — verifikasi pesanan → `catatLedger` (masuk/`store`/subtotal, ref `pesanan`); `batal` → `hapusLedgerRef`. (Ongkir **bukan** pendapatan.)
- `admin-event-actions.ts` — status "diterima" → `catatLedger` (masuk/`event`/total, ref `pendaftaran`); "ditolak" → `hapusLedgerRef`.
- `admin-bisnis.ts` — aktivasi/perpanjang langganan → insert `pembayaran_langganan` + `catatLedger` (masuk/`membership`/nominal, ref `langganan`).

---

## 6. Halaman Publik & Ortu — per halaman

### `/` Landing
- **File**: `app/page.tsx` (statis) + `Logo.tsx`. Konten hardcoded + JSON-LD SEO. **Tanpa backend.**

### `(legal)` — `/kebijakan-privasi`, `/kontak`, `/syarat-ketentuan`, `/tentang`
- **File**: `app/(legal)/*/page.tsx` + `(legal)/gaya.ts` + `@/lib/profil` (PROFIL/WA_LINK). Statis, **tanpa backend**.

### 📰 Artikel — `/artikel` & `/artikel/[slug]`
- **Fungsi data**: `getArtikelTerbit({q})`, `getArtikelBySlug(slug)` (`artikel.ts`). Detail punya `generateMetadata` + JSON-LD BlogPosting; isi via `ArtikelBody.tsx`.
- **Endpoint**: `auth.getUser()` (status login header), `artikel`.

### 🛒 Store — `/store` & `/store/[id]`
- **File**: `StoreView.tsx`/`ProdukDetail.tsx` + `RekamAktivitas`, `BottomNav`, `TambahKeranjangBtn`/`ProdukCard`.
- **Fungsi data**: `getProdukTampilCached()` (`publik.ts`) / `getProduk(id)` (`store.ts`); `getStatusLangganan()` (harga diskon trial/langganan).
- **Server action**: `tambahKeranjang` (`keranjang-actions.ts`), `catatAktivitas`.
- **Endpoint**: `produk`, `langganan`, `keranjang_item`, `aktivitas`.

### 🗓️ Event — `/event` & `/event/[id]/daftar`
- **Fungsi data**: `getEventTampilCached()` (`publik.ts`), `getStatusPendaftaranSaya()`/`getPesertaPerEvent()`/`getEvent(id)` (`event.ts`), `getEventBerCatatan()` (`catatan.ts`); daftar: `getStatusLangganan()`, `getPengaturanBayar()` + `waUntuk(cfg,'event')`.
- **Server action**: `daftarEvent(eventId, anakIds, buktiUrl)` (`event-actions.ts`); upload bukti via `DaftarForm.tsx`.
- **Endpoint**: `event`, `pendaftaran_event`, `anak`, `catatan_perkembangan`, `langganan`, `pengaturan_pembayaran`, `storage.from('aset')`.

### 💬 Komunitas — `/komunitas` & `/komunitas/[postId]`
- **Fungsi data**: `getFeed()`, `getTopikOptions()`, `getPostingan(id)` (`komunitas.ts`).
- **Server action**: `buatPostingan`, `toggleSuka`, `lapor`, `buatKomentar` (`komunitas-actions.ts`).
- **Endpoint**: `postingan`, `komentar`, `suka`, `laporan`, `profiles`, `kelas_bermain`/`event`/`paket_aset` (opsi topik), `aktivitas`.

### 🎈 Kelas — `/kelas/[id]`, `/kelas-saya`, `/favorit`
- **Fungsi data**: query inline `kelas_bermain` + `rekamRiwayat` (`riwayat-kelas.ts`); `getEventDiikuti()` (`event.ts`), `getRiwayatKelas()` (`riwayat-kelas.ts`); `getFavoritKelas()` (`favorit.ts`).
- **Server action**: `toggleFavorit` (`favorit-actions.ts`), `catatAktivitas`.
- **Endpoint**: `kelas_bermain`, `riwayat_kelas`, `pendaftaran_event`, `catatan_perkembangan`, `favorit`, `aktivitas`.

### 🛒 Keranjang & Pesanan — `/keranjang`, `/pesanan`, `/pesanan/[id]`
- **Fungsi data**: `getKeranjang()` (`keranjang.ts`), `getPesananSaya()`/`getPesanan(id)` (`pesanan.ts`), `getStatusLangganan()`, `getPengaturanBayar()` + `waUntuk(cfg,'store')`.
- **Server action**: `setQtyKeranjang`, `hapusKeranjang`, `checkout` (`keranjang-actions.ts`); `uploadBuktiPesanan` (`pesanan-actions.ts`, via `BuktiUpload.tsx`).
- **Endpoint**: `keranjang_item`, `produk`, `pesanan`, `item_pesanan`, `profiles`, `langganan`, `pengaturan_pembayaran`, `storage.from('aset')`.

### 🔐 Auth — `/login`, `/daftar`, `/lupa-sandi`, `/reset-sandi`
- **File**: client component penuh + `Logo.tsx`. Memakai Supabase client-side.
- **Endpoint**: `auth.signInWithPassword` / `signUp` / `resetPasswordForEmail` / `updateUser` / `signOut`; `profiles` (cek `is_guru` untuk arahkan; update nama/no_wa saat daftar).

### 👶 Ortu & Anak — `/pilih-anak`, `/anak/[anakId]`, `/anak/[anakId]/laporan`, `/ortu/[anakId]`, `/pengaturan`
- **Fungsi data**: `getEventTampilCached()`, `getStatusPendaftaranSaya()`, `getArtikelTerbit({limit:3})`, `getCatatanAnak()`, `getSertifikatAnak()`, `getGamifikasiAnak()` (`gamifikasi.ts`), `getPengaturanBayar()`; sisanya inline.
- **Server action**: `tambahAnak` (`pilih-anak/actions.ts`), `updateAnak`/`setBatas`/`hapusAnak`/`simpanProfilPengiriman`/`setPin` (`ortu-actions.ts`), `setNamaTampilan` (`komunitas-actions.ts`), `kirimFeedback` (`feedback-actions.ts`).
- **Endpoint**: `anak`, `langganan`, `profiles`, `hasil_main`, `event`, `pendaftaran_event`, `artikel`, `catatan_perkembangan`, `sertifikat`, `feedback`, `aktivitas`.

### 🎮 Game — `/pilih-game/[anakId]`, `/main/[anakId]`
- **Guard**: `getAnakTerjamin(anakId)` (`anak.ts`) — login + langganan + kepemilikan.
- **Fungsi data**: `getPustaka()` (`pustaka.ts`), `getVideoByKategori()` (`video.ts`), `getKelasAktifCached()` (`publik.ts`), `getFavoritIds()` (`favorit.ts`), `getGamifikasiAnak()` (`gamifikasi.ts`).
- **Server action**: `catatHasil` (`skor.ts`) via `GameRunner`, `catatRiwayatKelas` (`riwayat-actions.ts`), `catatAktivitas`.
- **Endpoint**: `anak`, `langganan`, `tema`, `paket_aset`, `video`, `kelas_bermain`, `favorit`, `hasil_main`, `lencana_anak`, `tantangan_kustom`(+`_anak`), `tantangan_anak`, `profiles` (pin), `riwayat_kelas`, `aktivitas`.

### 🍎 Guru — `/guru`, `/guru/[eventId]`, `/catatan/[eventId]`
- **Guard**: `getGuruTerjamin()` (`guru.ts`).
- **Fungsi data**: `getEventUntukGuru()`, `getPesertaEvent(eventId)` (`guru.ts`), `getEvent()`/`getCatatanEventSaya()` (`event.ts`/`catatan.ts`).
- **Server action**: `simpanCatatan` (`guru-actions.ts`, upsert).
- **Endpoint**: `profiles`, `event`, `pendaftaran_event`, `catatan_perkembangan`.

### 📈 Investor — `/investor`
- **Guard**: `getInvestorTerjamin()` (`investor.ts`). `robots: noindex`.
- **Fungsi data**: `getDashboardKeuangan()`, `getPerBulan(6)` (`keuangan.ts`).
- **Endpoint**: `profiles`, `transaksi_keuangan`, `langganan` (+ sumber lain via dashboard keuangan).

### 🏅 Sertifikat & Stiker — `/sertifikat/[id]`, `/stiker-event/[id]`
- **Fungsi data**: `getSertifikat(id)` (`sertifikat.ts`); stiker (**guard admin** `getAdminTerjamin`): `getEventAdmin(id)`, `getPendaftaranByEvent(id)`.
- **Komponen**: `SertifikatView`, `StikerSheet`, `UnduhPdfBtn`.
- **Endpoint**: `sertifikat`, `event`, `pendaftaran_event`.

> **Lintas-halaman**: `RekamAktivitas` (store/event/komunitas/pesanan/kelas-saya/pilih-anak/main/laporan) memanggil `catatAktivitas` → insert `aktivitas`. Fungsi `...Cached` di `publik.ts` memakai anon client + cache untuk `event`/`produk`/`kelas_bermain`.

---

## 7. REST API internal (untuk aplikasi mobile)

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
| `POST /api/anak` | `anak/route.ts` | tambah anak (validasi tgl lahir < hari ini, `mode_default` dari umur) | `anak` (insert) |
| `GET /api/anak/[id]/catatan` | `anak/[id]/catatan/route.ts` | catatan perkembangan per anak (join judul event) | `catatan_perkembangan` (+`event`) |
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

## 8. Infrastruktur & integrasi

### Supabase client (tiga cara, semua anon key)
- `lib/supabase/server.ts` — `createClient()` async, `@supabase/ssr` `createServerClient` + cookie SSR (`cookies()`; `setAll` di-try/catch). Untuk Server Component/halaman & reader/action.
- `lib/supabase/client.ts` — `createClient()` browser (`createBrowserClient`). Untuk komponen client (upload dsb).
- `lib/api/helpers.ts` — untuk REST API mobile: client `@supabase/supabase-js` tanpa cookie, di-scope Bearer.

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
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — hanya keduanya. Tidak ada service-role key.

---

## 9. Kamus tabel (data dictionary)

| Tabel | Kegunaan | Migrasi |
|---|---|---|
| `profiles` | akun + role (is_superuser/admin/guru/investor) + nama_tampilan/no_wa/alamat/pin_ortu | 0001, 0004, 0020, 0023, 0056 |
| `anak` | data anak (nama, tgl lahir, jenis kelamin, mode, koin/streak) | 0001, 0024, 0042 |
| `langganan` | status langganan/trial per user (trial_mulai, aktif_sampai, nominal) | 0001 |
| `pembayaran_langganan` | riwayat pembayaran membership | 0052 |
| `tema`, `paket_aset` | katalog game (tema + paket/butir aset) | 0001–0003, 0025–0037 |
| `video` | video edukasi (kategori baby/toddler) | 0003, 0005 |
| `kelas_bermain` | materi kelas bermain (+ worksheet, bahan) | 0009, 0013–0016 |
| `favorit` | kelas favorit user | 0015 |
| `postingan`, `komentar`, `suka`, `laporan` | komunitas + moderasi | 0010, 0011, 0028 |
| `event`, `pendaftaran_event` | event + pendaftaran (status, bukti, kehadiran, reschedule) | 0017, 0027 |
| `catatan_perkembangan` | catatan guru per anak per event | 0020 |
| `sertifikat` | e-sertifikat per anak/event | 0026, 0034 |
| `produk`, `keranjang_item`, `pesanan`, `item_pesanan` | store (diskon persen, berat) | 0019, 0049, 0050 |
| `pengaturan_pembayaran` | konfig harga/rekening/QRIS/WA (per jenis transaksi) | 0038, 0051 |
| `artikel` | blog SEO | 0041 |
| `hasil_main` | hasil sesi game (skor, durasi, mesin, tema) | 0001, 0033, 0039 |
| `lencana_anak`, `tantangan_anak`, `tantangan_kustom`(+`_anak`) | gamifikasi (streak/badge/tantangan usia) | 0042–0045 |
| `aktivitas` | log buka menu/fitur (analitik, DAU/MAU) | 0046 |
| `feedback` | masukan/survey NPS | 0047, 0048 |
| `transaksi_keuangan` | ledger keuangan (single source of truth) | 0052 |
| `aset` | aset perusahaan (keuangan) | 0052 |
| `kategori_aset`, `kategori_pengeluaran` | master kategori | 0053, 0055 |
| `anggaran` | budget per bulan & kategori | 0054 |
| `riwayat_kelas` | riwayat materi kelas yang dibuka | 0018 |

---

## 10. Alur penting

- **Pencatatan pendapatan (basis kas)**: pemasukan tercatat ke `transaksi_keuangan` saat admin **memverifikasi** — pesanan store (subtotal), pendaftaran event "diterima" (total), aktivasi langganan (nominal). Pembatalan meng-offset via `hapusLedgerRef`. Semua via `ledger.ts` (try/catch aman).
- **Checkout store**: keranjang → `POST /api/pesanan` atau server action `checkout` → `pesanan` (menunggu_ongkir) + `item_pesanan`, keranjang dikosongkan. Admin isi ongkir → user upload bukti → admin verifikasi (kurangi stok + catat ledger).
- **Gamifikasi**: `catatHasil` menyimpan `hasil_main`, memutakhirkan koin/streak `anak`, mengevaluasi `lencana_anak` & tantangan (`tantangan_anak`, `tantangan_kustom_anak`).
- **Keamanan role**: perubahan role hanya lewat `/admin/users` (guard super user/admin) + trigger `cegah_self_admin` yang membekukan kolom role untuk yang tak berwenang.

---

## 11. Diagram alur

### 11.1 Arsitektur tinggi
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
   Semua query pakai ANON KEY + RLS. Guard aplikasi (is_admin/is_superuser/…)
   + fungsi SQL is_admin() dipakai di kebijakan RLS. Tanpa service-role key.
```

### 11.2 Auth & routing masuk
```
Login (/login) ─signInWithPassword─▶ cek profiles.is_guru
      │                                      │
      │                             is_guru? ├── ya ──▶ /guru  (area guru)
      │                                      └── tidak ─▶ /pilih-anak (ortu)
Daftar (/daftar) ─signUp─▶ (trigger DB buat profiles+langganan trial)
                          └─▶ update nama_tampilan, no_wa
Guard halaman:
  /admin/*      → getAdminTerjamin()        (is_admin, else redirect)
  /admin/users  → getPengelolaUserTerjamin() (is_admin ATAU is_superuser)
  /investor     → getInvestorTerjamin()     (is_investor / is_admin)
  /main,/ortu,/pilih-game → getAnakTerjamin() (login+langganan+milik anak)
```

### 11.3 Checkout store → pendapatan (basis kas)
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

### 11.4 Pendaftaran event → pendapatan + sertifikat
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

### 11.5 Langganan → pembayaran, ledger, & pengingat WA
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

### 11.6 Ledger keuangan = single source of truth
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

### 11.7 Gamifikasi (mode anak main game)
```
/main/[anakId] ─▶ GameRunner ─selesai─▶ catatHasil (skor.ts)
   ├─▶ hasil_main (insert sesi: skor, durasi, mesin, tema)
   ├─▶ anak: koin += , streak (harian) diperbarui
   ├─▶ lencana_anak (evaluasi & beri lencana)
   └─▶ tantangan_anak / tantangan_kustom_anak (progres tantangan usia)
          │
          ▼  ditampilkan di /anak/[anakId]/laporan (getGamifikasiAnak)
```

### 11.8 Peran role & proteksi eskalasi
```
Super User ──atur──▶ [Super User] [Admin] [Guru] [Investor]
Admin      ──atur──▶                       [Guru] [Investor]
                     ▲ role tinggi hanya oleh Super User
Trigger cegah_self_admin (DB):
  bukan superuser  → is_admin & is_superuser DIBEKUKAN
  bukan admin/super→ is_guru & is_investor DIBEKUKAN
  ⇒ user biasa tak bisa menaikkan role dirinya (mis. is_investor)
```

> Diagram sengaja memakai ASCII agar selalu ter-render di PDF (`tools/md2pdf.py`) maupun GitHub tanpa dependency. Bila kelak ingin diagram Mermaid interaktif, template `md2pdf.py` perlu menyuntik `mermaid.js` + Chrome `--virtual-time-budget`.
