-- 0083_kelas_sampul.sql — gambar cover kelas bermain (untuk share IG Story, teaser, detail).
alter table public.kelas_bermain add column if not exists sampul_url text;
