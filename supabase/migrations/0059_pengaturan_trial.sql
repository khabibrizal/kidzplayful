-- 0059_pengaturan_trial.sql — izin akses fitur untuk user trial/tenggang (diatur admin)
create table if not exists public.pengaturan_trial (
  id int primary key default 1 check (id = 1),
  trial_kelas boolean not null default true,    -- trial boleh akses materi kelas bermain
  trial_game  boolean not null default true,    -- trial boleh akses game edukasi
  trial_video boolean not null default true,    -- trial boleh akses pojok video
  trial_maks_anak int not null default 3,       -- batas jumlah anak untuk user non-aktif
  updated_at timestamptz not null default now()
);
insert into public.pengaturan_trial (id) values (1) on conflict (id) do nothing;

alter table public.pengaturan_trial enable row level security;
drop policy if exists "baca pengaturan trial" on public.pengaturan_trial;
create policy "baca pengaturan trial" on public.pengaturan_trial for select to authenticated using (true);
drop policy if exists "admin ubah pengaturan trial" on public.pengaturan_trial;
create policy "admin ubah pengaturan trial" on public.pengaturan_trial for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
