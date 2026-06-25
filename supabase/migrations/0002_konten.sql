-- supabase/migrations/0002_konten.sql
create table public.tema (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  sampul text,                                  -- emoji sampul
  status text not null default 'disetujui' check (status in ('draf','disetujui')),
  is_minggu_ini boolean not null default false,
  jadwal_tayang date,
  created_at timestamptz not null default now()
);

create table public.paket_aset (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null references public.tema(id) on delete cascade,
  mesin text not null check (mesin in ('tekan-sesuai','seret-wadah','cari-pasangan','telusuri','pop','tuang','irama')),
  judul text not null,
  area_skill text not null,
  usia_min int not null default 2,
  usia_max int not null default 5,
  sumber text not null default 'manual' check (sumber in ('ai','manual')),
  status text not null default 'disetujui' check (status in ('draf','disetujui')),
  butir jsonb not null,
  urutan int not null default 0
);
create index paket_tema_idx on public.paket_aset(tema_id);

create table public.hasil_main (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  tema_id uuid references public.tema(id) on delete set null,
  mesin text not null,
  area_skill text not null,
  jumlah_coba int not null default 0,
  selesai boolean not null default false,
  durasi_detik int not null default 0,
  bintang int not null default 0,
  tanggal timestamptz not null default now()
);
create index hasil_anak_idx on public.hasil_main(anak_id);

-- RLS
alter table public.tema enable row level security;
alter table public.paket_aset enable row level security;
alter table public.hasil_main enable row level security;

create policy "baca tema disetujui" on public.tema
  for select to authenticated using (status = 'disetujui');
create policy "baca paket disetujui" on public.paket_aset
  for select to authenticated using (status = 'disetujui');

create policy "hasil milik ortu" on public.hasil_main
  for all to authenticated
  using (exists (select 1 from public.anak a where a.id = anak_id and a.ortu_id = auth.uid()))
  with check (exists (select 1 from public.anak a where a.id = anak_id and a.ortu_id = auth.uid()));

-- SEED: tema Hewan jadi "Minggu Ini" dengan 3 paket
with t as (
  insert into public.tema (nama, sampul, is_minggu_ini, status)
  values ('Hewan', '🐰', true, 'disetujui') returning id
)
insert into public.paket_aset (tema_id, mesin, judul, area_skill, usia_min, usia_max, butir, urutan)
select t.id, x.mesin, x.judul, x.area_skill, 2, 5, x.butir, x.urutan from t,
(values
  ('tekan-sesuai','Mana Ya?','kognitif',
   '{"soal":[{"tanya":"kucing","benar":"🐱","salah":["🐶","🐮","🐰"]},{"tanya":"anjing","benar":"🐶","salah":["🐱","🐸","🐷"]},{"tanya":"bebek","benar":"🦆","salah":["🐔","🐢","🐠"]},{"tanya":"gajah","benar":"🐘","salah":["🦒","🐭","🐧"]},{"tanya":"sapi","benar":"🐮","salah":["🐴","🐑","🐤"]}]}'::jsonb, 1),
  ('seret-wadah','Beres-Beres','motorik-halus',
   '{"wadah":[{"kategori":"buah","label":"Buah","emoji":"🧺"},{"kategori":"hewan","label":"Hewan","emoji":"🏠"}],"benda":[{"emoji":"🍎","kategori":"buah"},{"emoji":"🐱","kategori":"hewan"},{"emoji":"🍌","kategori":"buah"},{"emoji":"🐶","kategori":"hewan"}]}'::jsonb, 2),
  ('cari-pasangan','Cari Pasangan','kognitif',
   '{"pasangan":["🐱","🌸","🐶"]}'::jsonb, 3)
) as x(mesin, judul, area_skill, butir, urutan);
