-- 0089_paket_langganan.sql — Paket langganan bertingkat & berbayar PER ANAK.
--
-- Prinsip: semua HAK AKSES adalah DATA di baris paket, bukan cabang if di kode, supaya
-- pemilik bisa mengubah fasilitas/harga tanpa deploy (permintaan eksplisit: "tanpa hardcode").
-- Diskon per item disimpan sebagai PETA per kode paket (jsonb), bukan kolom per paket, supaya
-- menambah paket ketiga tidak butuh migrasi baru.

-- 1) Master paket ------------------------------------------------------------
create table if not exists public.paket_langganan (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,               -- 'basic' | 'preschool' — STABIL, jangan diubah
  nama text not null,
  deskripsi text,
  benefit jsonb not null default '[]',     -- ["Semua ide bermain","Diskon event", ...]
  harga_bulanan int not null default 0,    -- per ANAK per bulan
  diskon_keluarga jsonb not null default '[]', -- [{min_anak:2,persen:10},{min_anak:4,nominal:30000}]
  akses_ide_bermain boolean not null default true,
  akses_game boolean not null default true,
  akses_video boolean not null default true,
  akses_komunitas boolean not null default true,
  worksheet boolean not null default false,
  konsultasi_gratis_jumlah int not null default 0,
  konsultasi_gratis_satuan text not null default 'bulan'
    check (konsultasi_gratis_satuan in ('bulan','langganan')),
  rapor_bulanan boolean not null default false,
  urutan int not null default 0,           -- juga menentukan "paket tertinggi"
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed dua paket. Harga sengaja 0 — pemilik mengisinya sendiri di /admin/paket.
-- `on conflict do nothing` menjaga migrasi tetap idempoten TANPA menimpa harga yang sudah diisi.
insert into public.paket_langganan (kode, nama, deskripsi, benefit, harga_bulanan, diskon_keluarga,
  worksheet, konsultasi_gratis_jumlah, konsultasi_gratis_satuan, rapor_bulanan, urutan)
values
  ('basic', 'Basic', 'Bermain & belajar mandiri di rumah.',
   '["Semua Ide Bermain","Semua game edukasi","Pojok Video","Diskon event","Diskon produk","Gratis 1x konsultasi psikolog"]',
   0, '[]', false, 1, 'langganan', false, 10),
  ('preschool', 'Preschool', 'Kurikulum homeschooling lengkap dengan pendampingan.',
   '["Semua Ide Bermain","Unduh semua worksheet","Semua game edukasi","Pojok Video","Diskon event","Diskon produk","Konsultasi psikolog tiap bulan","Rapor bulanan yang bisa diunduh"]',
   0, '[{"min_anak":2,"persen":10}]', true, 1, 'bulan', true, 20)
on conflict (kode) do nothing;

alter table public.paket_langganan enable row level security;
drop policy if exists "paket baca semua" on public.paket_langganan;
create policy "paket baca semua" on public.paket_langganan for select to authenticated, anon using (true);
drop policy if exists "paket kelola admin" on public.paket_langganan;
create policy "paket kelola admin" on public.paket_langganan for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) Langganan PER ANAK ------------------------------------------------------
create table if not exists public.langganan_anak (
  anak_id uuid primary key references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  paket_id uuid references public.paket_langganan(id) on delete set null,
  paket_berikutnya_id uuid references public.paket_langganan(id) on delete set null,
  aktif_sampai date,
  updated_at timestamptz not null default now()
);
create index if not exists idx_langganan_anak_ortu on public.langganan_anak(ortu_id);

alter table public.langganan_anak enable row level security;
drop policy if exists "langganan anak baca" on public.langganan_anak;
create policy "langganan anak baca" on public.langganan_anak for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin());
-- Tulis HANYA admin. Orang tua mengubah paket berikutnya lewat server action (sub-proyek A2),
-- bukan lewat REST langsung — kalau tidak, ia bisa memberi dirinya paket tertinggi gratis.
drop policy if exists "langganan anak kelola admin" on public.langganan_anak;
create policy "langganan anak kelola admin" on public.langganan_anak for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3) Backfill member yang SEKARANG aktif → semua anaknya Preschool sampai periode habis.
--    (Keputusan pemilik: tidak boleh ada yang kehilangan akses di tengah periode terbayar.)
insert into public.langganan_anak (anak_id, ortu_id, paket_id, aktif_sampai)
select a.id, a.ortu_id,
       (select id from public.paket_langganan where kode = 'preschool'),
       l.aktif_sampai
from public.anak a
join public.langganan l on l.ortu_id = a.ortu_id
where l.aktif_sampai is not null and l.aktif_sampai >= current_date
on conflict (anak_id) do nothing;

-- 4) Worksheet: penanda "contoh terbuka" per materi -------------------------
alter table public.kelas_bermain add column if not exists worksheet_terbuka boolean not null default false;

-- 5) Diskon per paket pada event & produk (peta kode paket → persen) --------
alter table public.event  add column if not exists diskon_paket jsonb not null default '{}';
alter table public.produk add column if not exists diskon_paket jsonb not null default '{}';

-- 6) Trial jadi setelan admin (menggantikan konstanta TRIAL_HARI di kode) ---
alter table public.pengaturan_trial add column if not exists trial_hari int not null default 30;
alter table public.pengaturan_trial add column if not exists trial_paket_id uuid
  references public.paket_langganan(id) on delete set null;
update public.pengaturan_trial
   set trial_paket_id = (select id from public.paket_langganan where kode = 'basic')
 where id = 1 and trial_paket_id is null;
