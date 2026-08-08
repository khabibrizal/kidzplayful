-- 0088_transaksi_event.sql — kaitkan transaksi keuangan ke sebuah EVENT.
--
-- Tujuan: pengeluaran untuk kebutuhan event tertentu (sewa tempat, konsumsi, dekorasi, dll)
-- bisa dilacak di laporan transaksi — "pengeluaran ini untuk event apa".
--
-- KENAPA KOLOM BARU, bukan `ref_tipe='event'` + `ref_id`:
-- ada unique index `uq_transaksi_ref (ref_tipe, ref_id)` (0052:29, diperluas 0058) yang
-- memaksa SATU baris per referensi. Memakai ref_tipe untuk event berarti hanya boleh ada
-- satu pengeluaran per event — jelas salah. Selain itu `ref_tipe/ref_id` sudah dipakai
-- `getTransaksiDetail` untuk menentukan JENIS sumber transaksi; menumpanginya akan
-- mengacaukan percabangan itu.
--
-- ON DELETE SET NULL: menghapus event TIDAK boleh menghapus catatan keuangannya —
-- uang yang sudah keluar tetap harus tercatat di pembukuan.

alter table public.transaksi_keuangan
  add column if not exists event_id uuid references public.event(id) on delete set null;

-- Melayani: filter ledger per event & rekap pengeluaran per event.
create index if not exists idx_transaksi_event
  on public.transaksi_keuangan(event_id) where event_id is not null;
