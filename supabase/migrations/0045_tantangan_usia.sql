-- 0045_tantangan_usia.sql — rentang usia untuk tantangan kustom (tampil sesuai umur anak)
alter table public.tantangan_kustom add column if not exists usia_min int not null default 0;
alter table public.tantangan_kustom add column if not exists usia_max int not null default 99;
