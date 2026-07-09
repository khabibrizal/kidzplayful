-- 0055_kategori_pengeluaran.sql — master kategori pengeluaran (Fase 2 rapikan master)
-- kode = nilai stabil yang disimpan di ledger (logika 'marketing'/'aset'/'pajak' bergantung padanya).
create table if not exists public.kategori_pengeluaran (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  bawaan boolean not null default false,   -- true = bawaan sistem (tak bisa dihapus)
  created_at timestamptz not null default now()
);

alter table public.kategori_pengeluaran enable row level security;
drop policy if exists "kategori_pengeluaran baca" on public.kategori_pengeluaran;
create policy "kategori_pengeluaran baca" on public.kategori_pengeluaran for select to authenticated
  using (public.is_admin() or public.is_investor());
drop policy if exists "kategori_pengeluaran kelola" on public.kategori_pengeluaran;
create policy "kategori_pengeluaran kelola" on public.kategori_pengeluaran for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- seed dari konstanta lama (KATEGORI_KELUAR / LABEL_KATEGORI)
insert into public.kategori_pengeluaran (kode, nama, bawaan) values
  ('marketing','Marketing',true),
  ('event','Event',true),
  ('server','Server',true),
  ('domain','Domain',true),
  ('software','Software',true),
  ('office','Office',true),
  ('transport','Transport',true),
  ('gaji','Gaji',true),
  ('aset','Aset',true),
  ('pajak','Pajak',true),
  ('lainnya','Lainnya',true)
on conflict (kode) do nothing;
