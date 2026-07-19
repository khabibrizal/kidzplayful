-- 0076_kelas_tujuan_usia.sql — tujuan pembelajaran + rentang usia per kelas bermain.
alter table public.kelas_bermain
  add column if not exists tujuan text,
  add column if not exists usia_min int not null default 0,
  add column if not exists usia_max int not null default 6;
