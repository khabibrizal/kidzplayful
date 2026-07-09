# Blueprint Modul Keuangan / Business Management — KidzPlayful

**Dokumen rancangan (belum dieksekusi)** · Disusun: Juli 2026 · Referensi: PRD Business Management KidzPlayful v1.0

---

## 1. Latar Belakang & Tujuan
KidzPlayful memiliki 3 sumber pendapatan yang semuanya melalui sistem: **Event Kelas Bermain**, **Membership** (langganan bulanan), dan **Store** (education toys). Modul ini mencatat seluruh uang **masuk & keluar** secara otomatis, lalu menghasilkan laporan keuangan (laba-rugi, arus kas) untuk kebutuhan **operasional, investor, dan pajak**.

**Keputusan yang disepakati:**
- Basis pencatatan: **kas** — pendapatan dihitung saat pembayaran **diverifikasi admin**.
- Pajak: **catat omzet saja** dulu (estimasi PPh final 0,5% disiapkan, belum wajib).
- Cakupan v1: **Fondasi keuangan + Investor Dashboard + Pajak/Omzet**.
- Akses investor: **role login khusus** (read-only).
- Ongkir Store: **bukan pendapatan** (pass-through ke kurir).
- Data lama Store & Event: **di-backfill** ke ledger.

---

## 2. Kondisi Data Saat Ini (temuan)
| Sumber | Baris transaksi | Titik "lunas" | Bisa dihitung historis? |
|---|---|---|---|
| **Store** (`pesanan`) | 1 baris/pesanan (subtotal, ongkir, total) | status `diproses` (verifikasi admin) | ✅ Ya |
| **Event** (`pendaftaran_event`) | 1 baris/pendaftaran (total) | status `diterima` | ✅ Ya |
| **Membership** (`langganan`) | 1 baris/user, **di-overwrite** tiap perpanjang | saat `aktifkanLangganan` | ❌ **Tidak ada riwayat** |

**Celah utama:** membership tidak menyimpan riwayat pembayaran. Belum ada tabel keuangan apa pun (expense, arus kas, aset, ledger, pajak).

---

## 3. Arsitektur Inti — Ledger Keuangan Tunggal
Sebuah tabel **`transaksi_keuangan`** (append-only) mencatat **setiap** pergerakan uang. Semua laporan diturunkan dari sini — satu sumber kebenaran. Ini sekaligus menutup celah histori membership (tiap aktivasi = 1 baris ledger baru).

**Kolom:** arah (masuk/keluar), kategori, jumlah, tanggal, metode, keterangan, ref_tipe/ref_id (tautan ke pesanan/pendaftaran/langganan), lampiran, PIC.

**Pencatatan otomatis (basis kas):**
- Verifikasi pesanan Store → catat **masuk** = *subtotal* (ongkir tidak dihitung).
- Terima pendaftaran Event → catat **masuk** = *total*.
- Aktivasi Membership → catat **masuk** = *nominal*.
- Pembatalan/penolakan → baris ledger terkait dihapus.
- **Backfill sekali jalan** dari data Store & Event yang sudah lunas.
- **Pengeluaran & aset** diinput manual oleh admin.

Tambahan kolom `diverifikasi_pada` di pesanan & pendaftaran agar tanggal uang masuk akurat.

---

## 4. Modul Versi 1 (menu 💼 Keuangan di Admin)
| Modul | Isi |
|---|---|
| **Dashboard CEO** | Revenue hari ini/bulan ini, Total Expense, Net Profit, Saldo Kas, MRR, Active Member, Event bulan ini, Store order, Growth % |
| **Transaksi (Ledger)** | Daftar semua uang masuk/keluar + filter periode & kategori |
| **Expense** | Input pengeluaran (tanggal, kategori, vendor, nominal, metode, lampiran, PIC) |
| **Cash Flow** | Kas masuk vs keluar + saldo berjalan, filter harian/bulanan/tahunan |
| **Aset** | Pencatatan aset (kamera, laptop, dll.): harga beli, umur manfaat, lokasi, invoice |
| **Laporan Keuangan** | Revenue, Expense, Laba-Rugi, Cash Flow, per Produk/Bulan/Kategori — **ekspor PDF & Excel** |
| **Pajak / Omzet** | Omzet per bulan + estimasi PPh final 0,5% (info) |
| **Investor Dashboard** | Halaman read-only (role `is_investor`): Revenue, MRR, Growth, Profit, Cash, Member, Event, Store, Runway |

**Ditunda ke v2:** KPI detail, Business Intelligence/insight, Budget & Forecasting, Payroll, Inventory, Purchase Order, Vendor Management, Approval Flow, Jurnal/General Ledger, Bank Reconciliation.

---

## 5. Perubahan Data
- **Tabel baru:** `transaksi_keuangan` (ledger), `aset`.
- **Kolom baru:** `profiles.is_investor` (role); `pesanan.diverifikasi_pada`, `pendaftaran_event.diverifikasi_pada`.
- Semua hook pencatatan dibungkus pengaman agar transaksi inti tak terganggu bila modul belum aktif.

---

## 6. Rencana Implementasi Bertahap
1. **(a)** Ledger `transaksi_keuangan` + hook otomatis + backfill data lama.
2. **(b)** Expense + Cash Flow + Dashboard CEO.
3. **(c)** Aset + Laporan Keuangan + ekspor PDF/Excel.
4. **(d)** Pajak / Omzet.
5. **(e)** Role Investor + halaman `/investor` read-only.

Tiap tahap: `tsc`+`build` hijau, migrasi dijalankan manual di Supabase, verifikasi end-to-end, update dokumentasi.

---

## 7. Catatan
- Dokumen ini **rancangan** — implementasi menyusul setelah disetujui, dikerjakan bertahap (a–e).
- Histori pendapatan membership **tidak bisa** dipulihkan (data lama ter-overwrite); pencatatan akurat dimulai sejak modul aktif. Store & Event bisa di-backfill.
