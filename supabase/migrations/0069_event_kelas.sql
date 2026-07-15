-- 0069_event_kelas.sql
-- 1 event bisa punya 2 kelas (Baby & Toddler) dengan tgl/jam berbeda; bila kosong = gabungan.
-- Kolom kelas per event + kelas yang dipilih customer di pendaftaran.

alter table public.event
  add column if not exists baby_tanggal date,
  add column if not exists baby_jam_mulai text,
  add column if not exists baby_jam_selesai text,
  add column if not exists toddler_tanggal date,
  add column if not exists toddler_jam_mulai text,
  add column if not exists toddler_jam_selesai text;

alter table public.pendaftaran_event
  add column if not exists kelas text,        -- 'baby' | 'toddler' | 'gabungan' | null
  add column if not exists kelas_jadwal text; -- snapshot tampilan tgl + jam kelas terpilih
