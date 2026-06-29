-- supabase/migrations/0019_store.sql
-- Store: produk, keranjang (DB), pesanan, item_pesanan. Bayar manual + bukti, ongkir diisi admin.

-- PRODUK
create table if not exists public.produk (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  deskripsi text,
  kategori text,
  harga integer not null default 0,
  stok integer not null default 0,
  gambar_url text,
  status text not null default 'tampil', -- tampil | arsip
  created_at timestamptz not null default now()
);
alter table public.produk enable row level security;
drop policy if exists "produk baca" on public.produk;
create policy "produk baca" on public.produk for select to authenticated
  using (status = 'tampil' or public.is_admin());
drop policy if exists "produk kelola admin" on public.produk;
create policy "produk kelola admin" on public.produk for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- KERANJANG (per akun ortu)
create table if not exists public.keranjang_item (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  produk_id uuid not null references public.produk(id) on delete cascade,
  qty integer not null default 1,
  created_at timestamptz not null default now(),
  unique (ortu_id, produk_id)
);
alter table public.keranjang_item enable row level security;
drop policy if exists "keranjang milik sendiri" on public.keranjang_item;
create policy "keranjang milik sendiri" on public.keranjang_item for all to authenticated
  using (ortu_id = auth.uid()) with check (ortu_id = auth.uid());

-- PESANAN
create table if not exists public.pesanan (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'menunggu_ongkir',
  -- menunggu_ongkir | menunggu_bayar | dibayar | diproses | dikirim | selesai | batal
  subtotal integer not null default 0,
  ongkir integer not null default 0,
  total integer not null default 0,
  penerima text,
  no_hp text,
  alamat text,
  bukti_url text,
  no_resi text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pesanan enable row level security;
drop policy if exists "pesanan baca" on public.pesanan;
create policy "pesanan baca" on public.pesanan for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin());
drop policy if exists "pesanan insert sendiri" on public.pesanan;
create policy "pesanan insert sendiri" on public.pesanan for insert to authenticated
  with check (ortu_id = auth.uid());
drop policy if exists "pesanan update sendiri" on public.pesanan;
create policy "pesanan update sendiri" on public.pesanan for update to authenticated
  using (ortu_id = auth.uid()) with check (ortu_id = auth.uid());
drop policy if exists "pesanan update admin" on public.pesanan;
create policy "pesanan update admin" on public.pesanan for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ITEM PESANAN
create table if not exists public.item_pesanan (
  id uuid primary key default gen_random_uuid(),
  pesanan_id uuid not null references public.pesanan(id) on delete cascade,
  produk_id uuid references public.produk(id) on delete set null,
  nama text not null,
  harga integer not null default 0,
  qty integer not null default 1
);
alter table public.item_pesanan enable row level security;
drop policy if exists "item baca" on public.item_pesanan;
create policy "item baca" on public.item_pesanan for select to authenticated
  using (exists (select 1 from public.pesanan p where p.id = pesanan_id and (p.ortu_id = auth.uid() or public.is_admin())));
drop policy if exists "item insert sendiri" on public.item_pesanan;
create policy "item insert sendiri" on public.item_pesanan for insert to authenticated
  with check (exists (select 1 from public.pesanan p where p.id = pesanan_id and p.ortu_id = auth.uid()));
