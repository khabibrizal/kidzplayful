-- 0058_sponsor.sql — Modul Sponsor (sponsor + deal sponsorship + invoice + pembayaran inline)
-- Sponsor UANG dicatat ke ledger transaksi_keuangan (kategori 'sponsorship') saat Dibayar.
-- Sponsor BARANG (in-kind) dicatat nilai/deskripsinya, TIDAK masuk ledger kas.

-- ===== Sponsor (perusahaan) =====
create table if not exists public.sponsor (
  id uuid primary key default gen_random_uuid(),
  nama_perusahaan text not null,
  pic text,
  email text,
  telepon text,
  alamat text,
  npwp text,
  website text,
  industri text,
  created_at timestamptz not null default now()
);
alter table public.sponsor enable row level security;
drop policy if exists "baca sponsor" on public.sponsor;
create policy "baca sponsor" on public.sponsor for select to authenticated
  using (public.is_admin() or public.is_investor());
drop policy if exists "admin kelola sponsor" on public.sponsor;
create policy "admin kelola sponsor" on public.sponsor for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ===== Sponsorship (deal + invoice + pembayaran inline) =====
create table if not exists public.sponsorship (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsor(id) on delete cascade,
  nama_event text,
  jenis text not null default 'uang' check (jenis in ('uang','barang')),
  nilai int not null default 0,                 -- uang: nilai tagihan; barang: nilai estimasi
  deskripsi_barang text,                        -- untuk jenis barang
  benefit text,
  tanggal_mulai date,
  tanggal_selesai date,
  catatan text,
  status text not null default 'lead',          -- lead|negosiasi|kesepakatan|invoice|dibayar|selesai|batal
  -- invoice
  no_invoice text unique,
  invoice_tanggal date,
  jatuh_tempo date,
  -- pembayaran / penerimaan
  bayar_metode text,
  bayar_tanggal date,
  bayar_jumlah int,
  bayar_referensi text,
  bukti_url text,
  -- dokumen
  quotation_url text,
  agreement_url text,
  -- audit
  dibuat_oleh uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sponsorship_sponsor on public.sponsorship(sponsor_id);
create index if not exists idx_sponsorship_status on public.sponsorship(status);

alter table public.sponsorship enable row level security;
drop policy if exists "baca sponsorship" on public.sponsorship;
create policy "baca sponsorship" on public.sponsorship for select to authenticated
  using (public.is_admin() or public.is_investor());
drop policy if exists "admin kelola sponsorship" on public.sponsorship;
create policy "admin kelola sponsorship" on public.sponsorship for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ===== Perluas idempotency ledger agar mencakup 'sponsorship' =====
drop index if exists public.uq_transaksi_ref;
create unique index if not exists uq_transaksi_ref on public.transaksi_keuangan(ref_tipe, ref_id)
  where ref_tipe in ('pesanan','pendaftaran','sponsorship');
