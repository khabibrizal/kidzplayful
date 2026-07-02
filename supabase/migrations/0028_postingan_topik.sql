-- supabase/migrations/0028_postingan_topik.sql
-- Topik postingan komunitas sebagai teks bebas (diambil dari judul Kelas Bermain /
-- Event / Game). Menggantikan pemakaian tema_id sebagai "topik".
alter table public.postingan add column if not exists topik text;
