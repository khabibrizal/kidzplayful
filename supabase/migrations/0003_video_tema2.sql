-- supabase/migrations/0003_video_tema2.sql
create table public.video (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null references public.tema(id) on delete cascade,
  judul text not null,
  youtube_id text not null,
  durasi_detik int not null default 0,
  urutan int not null default 0,
  link_ok boolean not null default true,
  status text not null default 'disetujui' check (status in ('draf','disetujui'))
);
create index video_tema_idx on public.video(tema_id);

alter table public.video enable row level security;
create policy "baca video disetujui" on public.video
  for select to authenticated using (status = 'disetujui' and link_ok = true);

-- seed video untuk tema Hewan (youtube_id placeholder; ganti dgn kurasi nyata via Admin di M4)
insert into public.video (tema_id, judul, youtube_id, durasi_detik, urutan)
select id, 'Mengenal Suara Hewan', 'dQw4w9WgXcQ', 120, 1 from public.tema where nama = 'Hewan';
insert into public.video (tema_id, judul, youtube_id, durasi_detik, urutan)
select id, 'Lagu Hewan', 'aqz-KE-bpKQ', 180, 2 from public.tema where nama = 'Hewan';

-- seed tema kedua "Buah" (TIDAK minggu ini) supaya pustaka berisi >1 tema
with t as (
  insert into public.tema (nama, sampul, is_minggu_ini, status)
  values ('Buah', '🍎', false, 'disetujui') returning id
)
insert into public.paket_aset (tema_id, mesin, judul, area_skill, usia_min, usia_max, butir, urutan)
select t.id, x.mesin, x.judul, x.area_skill, x.umin, x.umax, x.butir, x.urutan from t,
(values
  ('tekan-sesuai','Mana Ya?','kognitif',2,5,
   '{"soal":[{"tanya":"apel","benar":"🍎","salah":["🍌","🍇","🍉"]},{"tanya":"pisang","benar":"🍌","salah":["🍎","🍓","🍐"]},{"tanya":"semangka","benar":"🍉","salah":["🍒","🥝","🍍"]}]}'::jsonb, 1),
  ('seret-wadah','Beres-Beres','motorik-halus',3,5,
   '{"wadah":[{"kategori":"merah","label":"Merah","emoji":"🟥"},{"kategori":"kuning","label":"Kuning","emoji":"🟨"}],"benda":[{"emoji":"🍎","kategori":"merah"},{"emoji":"🍌","kategori":"kuning"},{"emoji":"🍓","kategori":"merah"},{"emoji":"🍋","kategori":"kuning"}]}'::jsonb, 2),
  ('cari-pasangan','Cari Pasangan','kognitif',3,5,
   '{"pasangan":["🍎","🍌","🍇"]}'::jsonb, 3)
) as x(mesin, judul, area_skill, umin, umax, butir, urutan);
