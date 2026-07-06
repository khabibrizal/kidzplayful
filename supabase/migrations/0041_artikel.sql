-- 0041_artikel.sql — blog/artikel publik (untuk SEO konten)
create table if not exists public.artikel (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  judul text not null,
  ringkasan text not null default '',
  isi text not null default '',
  sampul_url text,
  status text not null default 'draf' check (status in ('draf','terbit')),
  terbit_pada timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_artikel_status_terbit on public.artikel(status, terbit_pada desc);

alter table public.artikel enable row level security;

-- publik (termasuk anon/Googlebot) boleh baca yang berstatus terbit; admin lihat semua
drop policy if exists "baca artikel terbit" on public.artikel;
create policy "baca artikel terbit" on public.artikel
  for select using (status = 'terbit' or public.is_admin());

-- hanya admin yang boleh menulis/ubah/hapus
drop policy if exists "admin kelola artikel" on public.artikel;
create policy "admin kelola artikel" on public.artikel
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
