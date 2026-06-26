-- supabase/migrations/0010_komunitas.sql
alter table public.profiles add column if not exists nama_tampilan text;

create table public.postingan (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  nama text not null,
  tema_id uuid references public.tema(id) on delete set null,
  teks text not null,
  status text not null default 'tampil' check (status in ('tampil','disembunyikan')),
  created_at timestamptz not null default now()
);
create index postingan_created_idx on public.postingan(created_at desc);

create table public.komentar (
  id uuid primary key default gen_random_uuid(),
  postingan_id uuid not null references public.postingan(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  nama text not null,
  teks text not null,
  status text not null default 'tampil' check (status in ('tampil','disembunyikan')),
  created_at timestamptz not null default now()
);
create index komentar_post_idx on public.komentar(postingan_id);

create table public.suka (
  postingan_id uuid not null references public.postingan(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  primary key (postingan_id, ortu_id)
);

alter table public.postingan enable row level security;
alter table public.komentar enable row level security;
alter table public.suka enable row level security;

create policy "baca postingan tampil" on public.postingan
  for select to authenticated using (status = 'tampil' or public.is_admin());
create policy "tulis postingan sendiri" on public.postingan
  for insert to authenticated with check (ortu_id = auth.uid());
create policy "hapus postingan sendiri/admin" on public.postingan
  for delete to authenticated using (ortu_id = auth.uid() or public.is_admin());
create policy "admin update postingan" on public.postingan
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "baca komentar tampil" on public.komentar
  for select to authenticated using (status = 'tampil' or public.is_admin());
create policy "tulis komentar sendiri" on public.komentar
  for insert to authenticated with check (ortu_id = auth.uid());
create policy "hapus komentar sendiri/admin" on public.komentar
  for delete to authenticated using (ortu_id = auth.uid() or public.is_admin());

create policy "baca suka" on public.suka for select to authenticated using (true);
create policy "suka sendiri" on public.suka for insert to authenticated with check (ortu_id = auth.uid());
create policy "batal suka sendiri" on public.suka for delete to authenticated using (ortu_id = auth.uid());
