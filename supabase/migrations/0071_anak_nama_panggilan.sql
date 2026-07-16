-- 0071_anak_nama_panggilan.sql
-- Nama panggilan anak (opsional). Dipakai a.l. di stiker event (tampil nama panggilan saja).
alter table public.anak add column if not exists nama_panggilan text;
