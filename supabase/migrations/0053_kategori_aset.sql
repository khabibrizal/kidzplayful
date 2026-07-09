-- 0053_kategori_aset.sql — master kategori aset (dropdown, tidak ketik manual)
create table if not exists public.kategori_aset (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_at timestamptz not null default now()
);
alter table public.kategori_aset enable row level security;
drop policy if exists "baca kategori aset" on public.kategori_aset;
create policy "baca kategori aset" on public.kategori_aset for select to authenticated using (true);
drop policy if exists "admin kelola kategori aset" on public.kategori_aset;
create policy "admin kelola kategori aset" on public.kategori_aset for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.kategori_aset (nama) values
  ('Kamera'), ('Laptop'), ('Lighting'), ('Printer'), ('Furniture'), ('Domain'), ('Hosting'), ('Software'), ('Alat Main'), ('Lainnya')
on conflict (nama) do nothing;
