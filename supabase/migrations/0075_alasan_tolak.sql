-- 0075_alasan_tolak.sql — alasan penolakan pendaftaran event (tampil ke orang tua).
alter table public.pendaftaran_event add column if not exists alasan_tolak text;
