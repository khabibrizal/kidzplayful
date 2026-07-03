-- supabase/migrations/0033_target_detik.sql
-- Mode Tantangan: target waktu (detik) per paket game. Selesai di bawah target = bonus.
alter table public.paket_aset add column if not exists target_detik int;
