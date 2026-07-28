-- 0084_voucher.sql — master voucher + redeem + kolom voucher pada transaksi.
create table if not exists public.voucher (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  tipe text not null check (tipe in ('nominal','persen')),
  nilai int not null check (nilai >= 0),
  berlaku_event boolean not null default false,
  berlaku_produk boolean not null default false,
  kuota_total int,
  kuota_per_user int,
  berlaku_dari date,
  berlaku_sampai date,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.voucher enable row level security;
drop policy if exists "voucher baca auth" on public.voucher;
create policy "voucher baca auth" on public.voucher for select to authenticated using (true);
drop policy if exists "voucher kelola admin" on public.voucher;
create policy "voucher kelola admin" on public.voucher for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.voucher_redeem (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.voucher(id) on delete cascade,
  ortu_id uuid not null references auth.users(id) on delete cascade,
  ref_tipe text not null check (ref_tipe in ('pendaftaran','pesanan')),
  ref_id uuid not null,
  potongan int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_voucher_redeem_ref on public.voucher_redeem(ref_tipe, ref_id);
create index if not exists voucher_redeem_voucher_idx on public.voucher_redeem(voucher_id);
alter table public.voucher_redeem enable row level security;
drop policy if exists "redeem baca sendiri/admin" on public.voucher_redeem;
create policy "redeem baca sendiri/admin" on public.voucher_redeem for select to authenticated using (ortu_id = auth.uid() or public.is_admin());
drop policy if exists "redeem insert sendiri" on public.voucher_redeem;
create policy "redeem insert sendiri" on public.voucher_redeem for insert to authenticated with check (ortu_id = auth.uid());
drop policy if exists "redeem kelola admin" on public.voucher_redeem;
create policy "redeem kelola admin" on public.voucher_redeem for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.pendaftaran_event add column if not exists voucher_id uuid references public.voucher(id) on delete set null;
alter table public.pendaftaran_event add column if not exists potongan_voucher int not null default 0;
alter table public.pesanan add column if not exists voucher_id uuid references public.voucher(id) on delete set null;
alter table public.pesanan add column if not exists potongan_voucher int not null default 0;
