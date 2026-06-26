-- supabase/migrations/0013_kelas_bermain_fields.sql
alter table public.panduan add column if not exists judul text;
alter table public.panduan add column if not exists aktivitas text;
alter table public.panduan add column if not exists cara_membuat text;
