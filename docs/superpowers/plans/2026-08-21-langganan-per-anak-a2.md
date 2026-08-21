# Langganan Per Anak — Sub-Proyek A2 (Pilih Paket & Tagihan) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps pakai checkbox (`- [ ]`).

**Goal:** Orang tua bisa **memilih paket per anak dan membayar sendiri**; admin cukup memverifikasi bukti, tidak berhitung.

**Architecture:** Tagihan berbentuk **induk + baris item per anak** (`tagihan_langganan`, `tagihan_langganan_item`). Seluruh nominal — subtotal, diskon keluarga bertingkat, voucher — dihitung **di server** oleh modul murni `lib/domain/langganan-harga.ts`; angka di browser hanya pratinjau. Verifikasi admin menyetel `langganan_anak` per item memakai `setPaketAnak` (A1) sehingga aturan "perpanjang dari tanggal berakhir" tak diduplikasi.

**Tech Stack:** Next.js 16 (Server Components + Server Actions), Supabase + RLS + trigger pelindung kolom, Vitest.

**Prasyarat:** A1 sudah tayang & migrasi 0089 dijalankan.

---

## Lingkup

Termasuk: halaman `/langganan`, tagihan + verifikasi admin, diskon keluarga, voucher langganan, pilih paket periode berikutnya (turun kelas), naik kelas kapan saja.
**Tidak** termasuk (sub-proyek lain): kuota konsultasi gratis (B), rapor bulanan (C), rebranding (D), payment gateway, prorata.

---

## Task 1: Migrasi 0090 — tagihan + voucher langganan + trigger pelindung

**Files:** Create `supabase/migrations/0090_tagihan_langganan.sql`

- [ ] **Step 1:** Tabel `tagihan_langganan` (ortu_id, status `menunggu_bayar|menunggu_verifikasi|diterima|ditolak`, subtotal, diskon_keluarga, voucher_id, potongan_voucher, total, bukti_url, alasan_tolak, created_at, diverifikasi_pada) + `tagihan_langganan_item` (tagihan_id, anak_id, paket_id, harga).
- [ ] **Step 2:** RLS — ortu **baca & buat** tagihannya sendiri; ortu **update** hanya lewat trigger pelindung (kolom uang & status ditolak); admin penuh.
- [ ] **Step 3:** Trigger `cegah_ubah_tagihan` + `cegah_ubah_langganan_anak`: non-admin hanya boleh mengubah `bukti_url` (tagihan) dan `paket_berikutnya_id` (langganan anak). Policy update untuk ortu ditambahkan bersamaan.
- [ ] **Step 4:** `voucher.berlaku_langganan` + CHECK `voucher_redeem.ref_tipe` diperluas `'langganan'`.
- [ ] **Step 5:** Commit.

## Task 2: Domain hitungan tagihan (murni + tes)

**Files:** Create `src/lib/domain/langganan-harga.ts`, `src/lib/domain/__tests__/langganan-harga.test.ts`

- [ ] **Step 1:** Tes gagal dulu — 1 anak; 2 anak paket sama; 2 anak paket campur (aturan keluarga diambil dari **paket tertinggi** di tagihan); 3 anak aturan bertingkat; aturan nominal; `min_anak` tak terpenuhi; voucher persen & nominal; voucher melebihi total (tak boleh minus); paket tak dikenal.
- [ ] **Step 2:** Implementasi `hitungTagihan({ item: [{anakId, paket}], voucher })` → `{ subtotal, diskonKeluarga, potonganVoucher, total, aturanDipakai }`.
- [ ] **Step 3:** Tes lulus → commit.

## Task 3: Reader & action tagihan

**Files:** Create `src/lib/data/tagihan.ts`, `src/lib/data/tagihan-actions.ts`

- [ ] **Step 1:** `getTagihanSaya()` (ortu), `getTagihanMenunggu()` (admin, + item & nama anak).
- [ ] **Step 2:** `buatTagihan({ pilihan: {anakId: paketId}[], kodeVoucher })` — **hitung ulang di server** dari master paket; tolak bila pilihan kosong; simpan induk + item + `voucher_redeem`.
- [ ] **Step 3:** `unggahBuktiTagihan(id, url)` → status `menunggu_verifikasi`. `setPaketBerikutnya(anakId, paketId|null)` untuk turun kelas.
- [ ] **Step 4:** Commit.

## Task 4: Verifikasi admin

**Files:** Create `src/lib/data/tagihan-admin-actions.ts`; Modify `src/app/admin/langganan/page.tsx`

- [ ] **Step 1:** `verifikasiTagihan(id)` — untuk tiap item panggil `setPaketAnak` (A1), terapkan `paket_berikutnya_id` bila ada, catat `pembayaran_langganan` + `catatLedger(kategori 'membership', ref_tipe 'tagihan_langganan')`, status `diterima`.
- [ ] **Step 2:** `tolakTagihan(id, alasan)` — status `ditolak`, `hapusLedgerRef`, hapus `voucher_redeem` (kuota voucher dilepas).
- [ ] **Step 3:** Blok "💳 Tagihan menunggu verifikasi" di halaman Langganan admin: rincian per anak, bukti via `BuktiLightbox`, tombol Verifikasi/Tolak.
- [ ] **Step 4:** Commit.

## Task 5: Halaman `/langganan` (sisi orang tua)

**Files:** Create `src/app/langganan/page.tsx`, `src/app/langganan/PilihPaketForm.tsx`; Modify `src/app/pengaturan/page.tsx`, `src/app/pilih-anak/page.tsx`

- [ ] **Step 1:** Kartu paket dari master (harga per anak + daftar benefit).
- [ ] **Step 2:** Tabel per anak: dropdown paket / "tidak ikut", rincian tagihan hidup (subtotal → diskon keluarga → voucher → total), input voucher (`cekVoucher(kode,'langganan',subtotal)`), rekening + QRIS, unggah bukti, tombol WA.
- [ ] **Step 3:** Bagian "Paket periode berikutnya" per anak (turun kelas) + keterangan bahwa naik kelas dibayar penuh tanpa prorata.
- [ ] **Step 4:** Tautan dari `/pengaturan` & spanduk `/pilih-anak`.
- [ ] **Step 5:** Commit.

## Task 6: Dokumentasi & gerbang mutu

- [ ] `tsc` → `eslint` → `npm test` → `npm run build`; DEVELOPER + DOKUMENTASI + regenerasi PDF; ingatkan pemilik menjalankan migrasi 0090.

---

## Verifikasi

1. Hitungan tagihan sebagai unit test (Task 2) — ini pengaman utama karena menyangkut uang.
2. E2E: 2 anak paket campur → tagihan menampilkan dua baris & total setelah diskon keluarga → unggah bukti → admin verifikasi → **kedua anak** dapat periode sesuai itemnya → ledger `membership` bertambah **sebesar total setelah diskon**.
3. Tolak tagihan → ledger hilang, kuota voucher kembali.
4. Turun kelas: pilih Basic untuk bulan depan → hak Preschool tetap sampai jatuh tempo → setelah verifikasi perpanjangan, paketnya Basic.
5. Keamanan (REST langsung sebagai ortu): PATCH `tagihan_langganan` `{total:0}` / `{status:'diterima'}` **harus gagal**; `{bukti_url}` **berhasil**. PATCH `langganan_anak` `{paket_id}` / `{aktif_sampai}` **harus gagal**; `{paket_berikutnya_id}` **berhasil**.
