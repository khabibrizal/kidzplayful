-- supabase/migrations/0021_reminder.sql
-- Penanda reminder WA H-1 sudah dikirim (per pendaftaran event).
alter table public.pendaftaran_event add column if not exists reminder_terkirim boolean not null default false;
