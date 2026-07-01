-- supabase/migrations/0024_anak_jenis_kelamin.sql
-- Jenis kelamin anak (opsional).
alter table public.anak add column if not exists jenis_kelamin text
  check (jenis_kelamin in ('laki-laki', 'perempuan'));
