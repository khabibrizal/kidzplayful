# Desain: Master Voucher & Redeem saat Transaksi

Tanggal: 2026-07-24
Status: disetujui

## Tujuan
Bisnis owner dapat membuat **master voucher** (kode, cakupan jenis transaksi, kuota, potongan, masa berlaku). User dapat **redeem voucher saat transaksi** (pendaftaran event / beli produk) dengan aturan yang ditentukan di master. Transaksi ber-voucher tercatat di laporan keuangan (pendapatan net + voucher terlacak).

## Keputusan bisnis (disetujui)
- **Kuota**: dua batas — `kuota_total` (global, semua user) DAN `kuota_per_user`. `null` = tak terbatas.
- **Cakupan**: per **jenis transaksi** — `berlaku_event` dan/atau `berlaku_produk` (bukan per item spesifik).
- **Potongan**: `tipe` = `nominal` (Rp) ATAU `persen` (%). Persen dihitung dari subtotal transaksi; potongan di-clamp ≤ subtotal (tak minus).
- **Masa berlaku**: `berlaku_dari` (opsional) – `berlaku_sampai`.
- **Menumpuk dengan diskon langganan**: BOLEH. Diskon pelanggan/trial diterapkan dulu (per item/anak, existing), voucher diterapkan sesudahnya pada total/subtotal.
- **Waktu kuota terpakai**: saat redeem (registrasi/checkout dibuat). Dilepas (hapus baris redeem) bila pendaftaran **ditolak** / pesanan **dibatalkan**.

## Skema data (migrasi `0084_voucher.sql`)
```sql
create table public.voucher (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,                 -- disimpan UPPERCASE
  tipe text not null check (tipe in ('nominal','persen')),
  nilai int not null check (nilai >= 0),     -- rupiah (nominal) atau persen 0-100
  berlaku_event boolean not null default false,
  berlaku_produk boolean not null default false,
  kuota_total int,                           -- null = tak terbatas
  kuota_per_user int,                        -- null = tak terbatas
  berlaku_dari date,                         -- null = sejak kapan pun
  berlaku_sampai date,                       -- null = tanpa akhir
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.voucher enable row level security;
drop policy if exists "voucher baca auth" on public.voucher;
create policy "voucher baca auth" on public.voucher for select to authenticated using (true);
drop policy if exists "voucher kelola admin" on public.voucher;
create policy "voucher kelola admin" on public.voucher for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.voucher_redeem (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.voucher(id) on delete cascade,
  ortu_id uuid not null references auth.users(id) on delete cascade,
  ref_tipe text not null check (ref_tipe in ('pendaftaran','pesanan')),
  ref_id uuid not null,
  potongan int not null default 0,
  created_at timestamptz not null default now()
);
create unique index uq_voucher_redeem_ref on public.voucher_redeem(ref_tipe, ref_id); -- 1 voucher per transaksi
create index voucher_redeem_voucher_idx on public.voucher_redeem(voucher_id);
alter table public.voucher_redeem enable row level security;
drop policy if exists "redeem baca sendiri/admin" on public.voucher_redeem;
create policy "redeem baca sendiri/admin" on public.voucher_redeem for select to authenticated using (ortu_id = auth.uid() or public.is_admin());
-- insert/delete dilakukan lewat server action (service context) — cukup policy admin utk kelola manual:
drop policy if exists "redeem kelola admin" on public.voucher_redeem;
create policy "redeem kelola admin" on public.voucher_redeem for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- kolom voucher pada transaksi
alter table public.pendaftaran_event add column if not exists voucher_id uuid references public.voucher(id) on delete set null;
alter table public.pendaftaran_event add column if not exists potongan_voucher int not null default 0;
alter table public.pesanan add column if not exists voucher_id uuid references public.voucher(id) on delete set null;
alter table public.pesanan add column if not exists potongan_voucher int not null default 0;
```
Catatan RLS: insert `voucher_redeem` oleh user terjadi di server action yang memakai session user; agar bisa insert baris miliknya, tambahkan policy insert user:
```sql
drop policy if exists "redeem insert sendiri" on public.voucher_redeem;
create policy "redeem insert sendiri" on public.voucher_redeem for insert to authenticated with check (ortu_id = auth.uid());
```

## Unit & perubahan

### 1. Master admin (pola kategori-usia)
- **Reader** `src/lib/data/voucher.ts`: `getVoucherSemua()` (admin list), `getVoucherByKode(kode)` (redeem — anon/authenticated baca).
- **Actions** `src/lib/data/voucher-actions.ts` (`'use server'`, `adminDb()` cek is_admin, return `{ok,error}`): `buatVoucher(input)`, `updateVoucher(id, patch)`, `hapusVoucher(id)`, `setAktifVoucher(id, aktif)`. `kode` di-`trim().toUpperCase()`; tolak duplikat (error 23505). Validasi: tipe∈{nominal,persen}; persen 0–100; minimal salah satu `berlaku_event`/`berlaku_produk` true.
- **Halaman** `src/app/admin/voucher/page.tsx` (server) + `VoucherAdmin.tsx` (client form/tabel): kode, tipe+nilai, checkbox Event/Produk, kuota total & per-user, tanggal berlaku, aktif.
- **Menu** `src/lib/menu-admin.ts`: `{ key: 'voucher', href: '/admin/voucher', label: '🎟️ Voucher' }`.

### 2. Validasi & hitung potongan (murni + server)
- **Util murni** `src/lib/domain/voucher.ts`:
  - `hitungPotongan(v: {tipe; nilai}, subtotal: number): number` — nominal → `min(nilai, subtotal)`; persen → `floor(subtotal * clamp(nilai,0,100)/100)`; hasil ≥0 & ≤subtotal. **Teruji vitest**.
  - `validasiVoucher(v, ctx)` → kode error string|null berdasar: aktif, tanggal (`berlaku_dari`/`sampai` vs `hariIni`), jenis (`berlaku_event`/`berlaku_produk` vs `ctx.jenis`). (Kuota dicek di server karena butuh DB count.) **Teruji vitest**.
- **Server action** `cekVoucher(kode, jenis: 'event'|'produk', subtotal, )` di `voucher-actions.ts`:
  - Ambil voucher by kode; jalankan `validasiVoucher`; cek kuota total (`count voucher_redeem where voucher_id`) & per-user (`+ ortu_id`); hitung `potongan`. Return `{ ok, voucher_id, potongan, error }`.
  - Pesan Indonesia: "Kode voucher tidak valid", "Voucher tidak aktif", "Voucher sudah kadaluarsa", "Voucher belum berlaku", "Voucher tidak berlaku untuk transaksi ini", "Kuota voucher habis", "Kamu sudah memakai voucher ini".

### 3. Redeem di pendaftaran event
- `src/app/event/[id]/daftar/DaftarForm.tsx`: field **Kode Voucher** + tombol **Terapkan** → panggil `cekVoucher(kode,'event', subtotalEvent, ...)`; simpan `voucher_id`+`potongan` di state; tampilkan baris "🎟️ Voucher −Rp X" & total setelah potongan. `subtotalEvent` = total sebelum voucher (harga anak setelah diskon langganan × anak + pendamping).
- `src/lib/data/event-actions.ts` `daftarEvent(..., voucherId?)`: setelah hitung `total`, bila `voucherId` → **re-validasi server** (cekVoucher ulang by id) → `potongan = hitungPotongan`; `total = max(0, total - potongan)`; insert `pendaftaran_event` dengan `voucher_id, potongan_voucher`; setelah insert sukses → insert `voucher_redeem {voucher_id, ortu_id, ref_tipe:'pendaftaran', ref_id: <id pendaftaran baru>, potongan}`. Bila re-validasi gagal → `{ok:false,error}` (jangan diam-diam buang voucher).
- `src/lib/data/admin-event-actions.ts` `setStatusPendaftaran`: saat **ditolak** → selain `hapusLedgerRef`, hapus `voucher_redeem where ref_tipe='pendaftaran' and ref_id=id` (lepas kuota). Saat diterima → `catatLedger` memakai `total` (sudah net) — tak berubah.

### 4. Redeem di beli produk
- Halaman checkout keranjang (client) + `src/lib/data/keranjang-actions.ts` `checkout(..., voucherId?)`: field Kode Voucher + Terapkan (`cekVoucher(kode,'produk', subtotal, ...)`); pada checkout re-validasi → `potongan`; simpan `pesanan.voucher_id, potongan_voucher`; `total = subtotal - potongan` (ongkir belum ada); insert `voucher_redeem {ref_tipe:'pesanan', ref_id: pesanan.id}`. **Penting**: ledger store mencatat `subtotal` (bukan total) di `verifikasiPesanan` → agar potongan tercermin di pendapatan, `verifikasiPesanan` mencatat `subtotal - potongan_voucher` (net). Sesuaikan `catatLedger jumlah` di `verifikasiPesanan` menjadi `(pes.subtotal - pes.potongan_voucher)`.
- `src/lib/data/admin-store-actions.ts` `ubahStatusPesanan` status `batal` → selain `hapusLedgerRef`, hapus `voucher_redeem` ref pesanan (lepas kuota).

### 5. Laporan
- Pendapatan net otomatis (ledger memakai nilai sudah dikurangi voucher).
- `getTransaksiDetail` (`keuangan.ts`): saat `ref_tipe` `pendaftaran`/`pesanan`, ikutkan `voucher_id`+`potongan_voucher` (join `voucher.kode`) → tampilkan "🎟️ Voucher <KODE> −Rp X" di detail transaksi `/admin/keuangan`.

### 6. Testing
- **Unit (vitest)** `src/lib/domain/__tests__/voucher.test.ts`: `hitungPotongan` (nominal ≤ subtotal, persen floor & clamp, 0), `validasiVoucher` (nonaktif, kadaluarsa, belum berlaku, jenis tak cocok, valid → null).
- **Manual**: buat voucher event (kuota total 2, per-user 1, −20%, berlaku sampai besok). (a) redeem di pendaftaran event → potongan tampil, tersimpan; (b) user sama redeem voucher event lain di transaksi kedua → sukses (per voucher, bukan per transaksi) TAPI redeem voucher SAMA lagi oleh user itu → "Kamu sudah memakai"; (c) redeem voucher event di beli produk → "tidak berlaku untuk transaksi ini"; (d) lewat tanggal → "kadaluarsa"; (e) kuota total habis → "Kuota habis"; (f) tolak pendaftaran → kuota kembali; (g) `/admin/keuangan` detail transaksi tampil voucher & pendapatan net.
- Gerbang: `npx tsc --noEmit` + `npm test` + `npm run build` hijau.

## Langkah manual pasca-implementasi
- Jalankan `0084_voucher.sql` di Supabase SQL Editor.

## Batas (YAGNI)
- Cakupan per jenis transaksi (bukan item spesifik); tanpa minimal belanja; 1 voucher per transaksi (unique index ref); tanpa realtime; langganan (subscription) tidak termasuk cakupan voucher.
