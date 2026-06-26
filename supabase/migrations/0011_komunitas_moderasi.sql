-- supabase/migrations/0011_komunitas_moderasi.sql
create table public.laporan (
  id uuid primary key default gen_random_uuid(),
  postingan_id uuid references public.postingan(id) on delete cascade,
  komentar_id uuid references public.komentar(id) on delete cascade,
  pelapor uuid not null references public.profiles(id) on delete cascade,
  alasan text,
  created_at timestamptz not null default now()
);
create index laporan_created_idx on public.laporan(created_at desc);

alter table public.laporan enable row level security;
create policy "lapor insert sendiri" on public.laporan
  for insert to authenticated with check (pelapor = auth.uid());
create policy "admin baca laporan" on public.laporan
  for select to authenticated using (public.is_admin());
create policy "admin hapus laporan" on public.laporan
  for delete to authenticated using (public.is_admin());

create policy "admin update komentar" on public.komentar
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
