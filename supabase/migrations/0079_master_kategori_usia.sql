-- 0079_master_kategori_usia.sql — master Kategori Usia (dipakai form Game / paket_aset).
-- Game memilih kategori; usia_min/usia_max paket tetap di-snapshot dari range kategori
-- agar filtering umur anak yang sudah ada tetap jalan. kategori_usia_id utk pengelompokan.
create table if not exists public.kategori_usia (
  id uuid primary key default gen_random_uuid(),
  nama text not null,            -- mis. "Batita", "Prasekolah"
  usia_min int not null default 0,
  usia_max int not null default 6,
  urutan int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.kategori_usia enable row level security;
drop policy if exists "kategori usia baca" on public.kategori_usia;
create policy "kategori usia baca" on public.kategori_usia for select to authenticated using (true);
drop policy if exists "kategori usia kelola admin" on public.kategori_usia;
create policy "kategori usia kelola admin" on public.kategori_usia for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- kolom penanda kategori di paket_aset (nullable: game lama tetap valid via usia_min/max)
alter table public.paket_aset
  add column if not exists kategori_usia_id uuid references public.kategori_usia(id) on delete set null;
create index if not exists paket_kategori_usia_idx on public.paket_aset(kategori_usia_id);

-- Seed kategori awal (0–6 th). Admin bisa ubah/tambah di /admin/kategori-usia.
insert into public.kategori_usia (nama, usia_min, usia_max, urutan) values
  ('Bayi (0–1 th)',        0, 1, 1),
  ('Batita (1–3 th)',      1, 3, 2),
  ('Prasekolah (3–5 th)',  3, 5, 3),
  ('TK (5–6 th)',          5, 6, 4)
on conflict do nothing;
