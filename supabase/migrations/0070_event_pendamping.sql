-- 0070_event_pendamping.sql
-- Harga tambah pendamping per event (beda tiap event) + jumlah pendamping di pendaftaran.
alter table public.event
  add column if not exists harga_pendamping integer not null default 0;

alter table public.pendaftaran_event
  add column if not exists jumlah_pendamping int not null default 0;
