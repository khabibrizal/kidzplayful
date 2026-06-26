-- supabase/migrations/0004_admin.sql
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- helper: apakah user saat ini admin
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- RLS tulis konten: hanya admin (baca tetap dari kebijakan lama 'disetujui')
create policy "admin kelola tema" on public.tema
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin kelola paket" on public.paket_aset
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin kelola video" on public.video
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin juga boleh baca draf (kebijakan baca lama hanya 'disetujui')
create policy "admin baca semua tema" on public.tema
  for select to authenticated using (public.is_admin());
create policy "admin baca semua paket" on public.paket_aset
  for select to authenticated using (public.is_admin());
create policy "admin baca semua video" on public.video
  for select to authenticated using (public.is_admin());
