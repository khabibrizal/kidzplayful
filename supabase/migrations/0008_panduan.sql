-- supabase/migrations/0008_panduan.sql
create table public.panduan (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null unique references public.tema(id) on delete cascade,
  bahan text,
  langkah jsonb not null default '[]'::jsonb,
  worksheet_url text,
  status text not null default 'disetujui' check (status in ('draf','disetujui'))
);

alter table public.panduan enable row level security;
create policy "baca panduan disetujui" on public.panduan
  for select to authenticated using (status = 'disetujui');
create policy "admin kelola panduan" on public.panduan
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin baca semua panduan" on public.panduan
  for select to authenticated using (public.is_admin());
