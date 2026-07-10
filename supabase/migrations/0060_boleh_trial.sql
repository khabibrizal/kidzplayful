-- 0060_boleh_trial.sql — tandai konten mana yang boleh diakses user trial (per item)
-- Default true = tampil untuk trial (longgar); admin uncheck untuk membatasi (mis. hanya materi A).
alter table public.kelas_bermain add column if not exists boleh_trial boolean not null default true;
alter table public.tema          add column if not exists boleh_trial boolean not null default true;
alter table public.video         add column if not exists boleh_trial boolean not null default true;
