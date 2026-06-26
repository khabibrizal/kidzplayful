-- supabase/migrations/0014_kelas_bermain.sql
create table public.kelas_bermain (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  aktivitas text,
  bahan text,
  cara_membuat text,
  langkah jsonb not null default '[]'::jsonb,
  link_ide text,
  worksheet_url text,
  status text not null default 'aktif' check (status in ('aktif','nonaktif')),
  created_at timestamptz not null default now()
);
create index kelas_bermain_created_idx on public.kelas_bermain(created_at desc);

alter table public.kelas_bermain enable row level security;
create policy "baca kelas aktif" on public.kelas_bermain
  for select to authenticated using (status = 'aktif' or public.is_admin());
create policy "admin kelola kelas" on public.kelas_bermain
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
