-- 0046_aktivitas.sql — log aktivitas (buka menu/fitur) untuk analitik
create table if not exists public.aktivitas (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  anak_id uuid references public.anak(id) on delete set null,
  fitur text not null,
  dibuat_at timestamptz not null default now()
);
create index if not exists idx_aktivitas_waktu on public.aktivitas(dibuat_at desc);
create index if not exists idx_aktivitas_fitur on public.aktivitas(fitur);
create index if not exists idx_aktivitas_ortu on public.aktivitas(ortu_id, dibuat_at desc);

alter table public.aktivitas enable row level security;
-- user hanya boleh mencatat aktivitas dirinya sendiri
drop policy if exists "catat aktivitas sendiri" on public.aktivitas;
create policy "catat aktivitas sendiri" on public.aktivitas
  for insert to authenticated with check (ortu_id = auth.uid());
-- admin baca semua
drop policy if exists "admin baca aktivitas" on public.aktivitas;
create policy "admin baca aktivitas" on public.aktivitas
  for select to authenticated using (public.is_admin());
