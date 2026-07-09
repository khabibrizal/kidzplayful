-- 0054_anggaran.sql — Anggaran (budget) per bulan & kategori pengeluaran (Fase 2C)
create table if not exists public.anggaran (
  id uuid primary key default gen_random_uuid(),
  ym text not null,                 -- periode 'YYYY-MM'
  kategori text not null,           -- kategori pengeluaran (marketing/server/...)
  jumlah int not null default 0,
  created_at timestamptz not null default now(),
  unique (ym, kategori)
);
create index if not exists idx_anggaran_ym on public.anggaran(ym);

alter table public.anggaran enable row level security;
drop policy if exists "anggaran baca" on public.anggaran;
create policy "anggaran baca" on public.anggaran for select to authenticated
  using (public.is_admin() or public.is_investor());
drop policy if exists "anggaran kelola" on public.anggaran;
create policy "anggaran kelola" on public.anggaran for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
