-- 0044_tantangan_kustom.sql — quest/tantangan kustom buatan admin (stok gamifikasi)

-- catat game mana yang diselesaikan (agar syarat "game spesifik" bisa dievaluasi)
alter table public.hasil_main add column if not exists paket_id uuid references public.paket_aset(id) on delete set null;
create index if not exists idx_hasil_main_paket on public.hasil_main(paket_id);

-- definisi tantangan kustom
create table if not exists public.tantangan_kustom (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  deskripsi text not null default '',
  lencana_kode text not null,          -- hadiah: kode lencana bawaan
  bonus_koin int not null default 0,
  syarat jsonb not null default '[]',  -- [{tipe:'paket'|'mesin'|'tema'|'apa', ref?, jumlah, minBintang}]
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.tantangan_kustom enable row level security;
drop policy if exists "baca tantangan aktif" on public.tantangan_kustom;
create policy "baca tantangan aktif" on public.tantangan_kustom
  for select to authenticated using (aktif or public.is_admin());
drop policy if exists "admin kelola tantangan" on public.tantangan_kustom;
create policy "admin kelola tantangan" on public.tantangan_kustom
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- progres/penyelesaian tantangan kustom per anak
create table if not exists public.tantangan_kustom_anak (
  anak_id uuid not null references public.anak(id) on delete cascade,
  tantangan_id uuid not null references public.tantangan_kustom(id) on delete cascade,
  selesai_pada timestamptz not null default now(),
  primary key (anak_id, tantangan_id)
);
alter table public.tantangan_kustom_anak enable row level security;
drop policy if exists "kelola progres tantangan sendiri" on public.tantangan_kustom_anak;
create policy "kelola progres tantangan sendiri" on public.tantangan_kustom_anak
  for all to authenticated
  using (exists (select 1 from public.anak a where a.id = tantangan_kustom_anak.anak_id and a.ortu_id = auth.uid()))
  with check (exists (select 1 from public.anak a where a.id = tantangan_kustom_anak.anak_id and a.ortu_id = auth.uid()));
drop policy if exists "admin baca progres tantangan" on public.tantangan_kustom_anak;
create policy "admin baca progres tantangan" on public.tantangan_kustom_anak
  for select to authenticated using (public.is_admin());
