# KidzPlayful — M16: Store (Marketplace mini) — Implementation Plan

**Goal:** Jualan mainan/bahan activity. User: katalog → detail → keranjang → checkout → bayar manual (upload bukti) → pesanan. Admin: CRUD produk + kelola pesanan (set ongkir, verifikasi, resi).

**Keputusan:** bayar **manual transfer + bukti**, ongkir **diisi admin**, keranjang **di database**, stok **dikurangi saat admin verifikasi (diproses)**.

## Data (migrasi 0019)
- `produk(nama,deskripsi,kategori,harga,stok,gambar_url,status[tampil|arsip])` — RLS baca tampil/admin, kelola admin.
- `keranjang_item(ortu_id,produk_id,qty)` unique(ortu_id,produk_id) — RLS milik sendiri.
- `pesanan(ortu_id,status,subtotal,ongkir,total,penerima,no_hp,alamat,bukti_url,no_resi,catatan)` — RLS baca/insert/update sendiri + admin update.
- `item_pesanan(pesanan_id,produk_id,nama,harga,qty)` — RLS via relasi pesanan.

**Status pesanan:** menunggu_ongkir → menunggu_bayar → dibayar → diproses → dikirim → selesai (atau batal).

## File
- types: `Produk, KeranjangItem, Pesanan, ItemPesanan, StatusPesanan` di tipe.ts. `format.ts` + `STATUS_PESANAN`.
- data: `store.ts`, `keranjang.ts`, `keranjang-actions.ts` (tambah/setQty/hapus/checkout), `pesanan.ts`, `pesanan-actions.ts` (uploadBukti), `admin-store.ts`, `admin-store-actions.ts` (CRUD produk + setOngkir/verifikasi/setResi/ubahStatus).
- komponen: `ProdukCard.tsx`, `TambahKeranjangBtn.tsx`.
- user pages: `/store` (+StoreView), `/store/[id]` (+ProdukDetail), `/keranjang` (+KeranjangView), `/pesanan` (+`/[id]` + BuktiUpload).
- admin: `/admin/produk` (+ProdukAdmin), `/admin/pesanan` (+PesananAdmin); nav admin + Produk/Pesanan.
- bottom nav: tambah 🛒 Store + 📦 Pesanan (kini 6 tab).

## Keamanan
- Total subtotal dihitung server saat checkout (snapshot harga di item_pesanan). Ongkir & verifikasi admin-only. Stok dikurangi saat verifikasi.
- Upload gambar produk = admin (folder produk/); bukti bayar = user (folder bukti/, policy 0017).

## DoD
Build/tsc/lint hijau, migrasi dijalankan. Alur lengkap user beli → admin proses terverifikasi.
