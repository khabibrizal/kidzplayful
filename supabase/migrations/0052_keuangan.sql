-- 0052_keuangan.sql — Modul Keuangan v1: ledger, riwayat membership, aset, role investor, kolom verifikasi

-- ===== Ledger keuangan (sumber tunggal) =====
create table if not exists public.transaksi_keuangan (
  id uuid primary key default gen_random_uuid(),
  arah text not null check (arah in ('masuk','keluar')),
  kategori text not null,
  jumlah int not null default 0,
  tanggal date not null default current_date,
  metode text,
  keterangan text,
  ref_tipe text,               -- 'pesanan'|'pendaftaran'|'langganan'|'manual'|'aset'
  ref_id uuid,
  lampiran_url text,
  pic text,
  dibuat_oleh uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_transaksi_tanggal on public.transaksi_keuangan(tanggal desc);
create index if not exists idx_transaksi_arah_kat on public.transaksi_keuangan(arah, kategori);
-- idempoten: 1 pemasukan per pesanan/pendaftaran (cegah dobel saat re-verifikasi)
create unique index if not exists uq_transaksi_ref on public.transaksi_keuangan(ref_tipe, ref_id) where ref_tipe in ('pesanan','pendaftaran');

alter table public.transaksi_keuangan enable row level security;
drop policy if exists "baca transaksi keuangan" on public.transaksi_keuangan;
create policy "baca transaksi keuangan" on public.transaksi_keuangan for select to authenticated using (public.is_admin() or public.is_investor());
drop policy if exists "admin kelola transaksi" on public.transaksi_keuangan;
create policy "admin kelola transaksi" on public.transaksi_keuangan for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== Riwayat pembayaran membership =====
create table if not exists public.pembayaran_langganan (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  nominal int not null default 0,
  periode_mulai date,
  periode_sampai date,
  metode text,
  dibayar_pada timestamptz not null default now()
);
create index if not exists idx_pembayaran_langganan_ortu on public.pembayaran_langganan(ortu_id, dibayar_pada desc);
alter table public.pembayaran_langganan enable row level security;
drop policy if exists "baca pembayaran langganan" on public.pembayaran_langganan;
create policy "baca pembayaran langganan" on public.pembayaran_langganan for select to authenticated using (public.is_admin() or public.is_investor());
drop policy if exists "admin kelola pembayaran langganan" on public.pembayaran_langganan;
create policy "admin kelola pembayaran langganan" on public.pembayaran_langganan for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== Aset =====
create table if not exists public.aset (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text,
  harga_beli int not null default 0,
  tanggal_beli date,
  umur_manfaat_bulan int,
  lokasi text,
  invoice_url text,
  catatan text,
  created_at timestamptz not null default now()
);
alter table public.aset enable row level security;
drop policy if exists "baca aset" on public.aset;
create policy "baca aset" on public.aset for select to authenticated using (public.is_admin() or public.is_investor());
drop policy if exists "admin kelola aset" on public.aset;
create policy "admin kelola aset" on public.aset for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== Kolom tanggal verifikasi (akurasi tanggal kas) =====
alter table public.pesanan add column if not exists diverifikasi_pada timestamptz;
alter table public.pendaftaran_event add column if not exists diverifikasi_pada timestamptz;

-- ===== Role investor =====
alter table public.profiles add column if not exists is_investor boolean not null default false;
create or replace function public.is_investor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_investor from public.profiles p where p.id = auth.uid()), false);
$$;

-- ===== Backfill data lama (Store & Event) =====
insert into public.transaksi_keuangan (arah, kategori, jumlah, tanggal, ref_tipe, ref_id, keterangan)
select 'masuk', 'store', coalesce(subtotal, 0), coalesce(diverifikasi_pada, updated_at, created_at)::date, 'pesanan', id, 'Backfill pesanan #' || left(id::text, 8)
from public.pesanan where status in ('diproses', 'dikirim', 'selesai')
on conflict do nothing;

insert into public.transaksi_keuangan (arah, kategori, jumlah, tanggal, ref_tipe, ref_id, keterangan)
select 'masuk', 'event', coalesce(total, 0), coalesce(diverifikasi_pada, created_at)::date, 'pendaftaran', id, 'Backfill pendaftaran event'
from public.pendaftaran_event where status = 'diterima'
on conflict do nothing;
