-- 0042_gamifikasi.sql — streak harian, lencana, tantangan harian
alter table public.anak add column if not exists streak int not null default 0;
alter table public.anak add column if not exists streak_terakhir date;

-- lencana yang didapat tiap anak
create table if not exists public.lencana_anak (
  anak_id uuid not null references public.anak(id) on delete cascade,
  kode text not null,
  didapat_pada timestamptz not null default now(),
  primary key (anak_id, kode)
);
alter table public.lencana_anak enable row level security;
drop policy if exists "kelola lencana anak sendiri" on public.lencana_anak;
create policy "kelola lencana anak sendiri" on public.lencana_anak
  for all to authenticated
  using (exists (select 1 from public.anak a where a.id = lencana_anak.anak_id and a.ortu_id = auth.uid()))
  with check (exists (select 1 from public.anak a where a.id = lencana_anak.anak_id and a.ortu_id = auth.uid()));

-- status tantangan harian per anak (1 baris per hari, penanda bonus sudah diklaim)
create table if not exists public.tantangan_anak (
  anak_id uuid not null references public.anak(id) on delete cascade,
  tanggal date not null,
  kode text not null,
  selesai boolean not null default false,
  primary key (anak_id, tanggal)
);
alter table public.tantangan_anak enable row level security;
drop policy if exists "kelola tantangan anak sendiri" on public.tantangan_anak;
create policy "kelola tantangan anak sendiri" on public.tantangan_anak
  for all to authenticated
  using (exists (select 1 from public.anak a where a.id = tantangan_anak.anak_id and a.ortu_id = auth.uid()))
  with check (exists (select 1 from public.anak a where a.id = tantangan_anak.anak_id and a.ortu_id = auth.uid()));
