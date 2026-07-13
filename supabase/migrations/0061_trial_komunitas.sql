-- 0061_trial_komunitas.sql — opsi akses fitur Komunitas untuk user trial (global on/off)
alter table public.pengaturan_trial add column if not exists trial_komunitas boolean not null default true;
