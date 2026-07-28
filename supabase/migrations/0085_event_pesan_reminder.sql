-- 0085_event_pesan_reminder.sql — pesan WA manual per event (dipakai halaman reminder).
alter table public.event add column if not exists pesan_reminder text;
