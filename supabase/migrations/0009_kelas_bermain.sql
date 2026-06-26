-- supabase/migrations/0009_kelas_bermain.sql
alter table public.panduan add column if not exists materi text;
alter table public.panduan add column if not exists link_ide text;
