-- supabase/migrations/0017_event.sql
-- Event kelas bermain offline + pendaftaran (harga per anak, status Terima/Tolak).

create table if not exists public.event (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  lokasi text,
  tanggal date,
  jam_mulai text,
  jam_selesai text,
  deskripsi text,
  gambar_url text,
  harga_per_anak integer not null default 0,
  status text not null default 'tampil', -- tampil | arsip
  created_at timestamptz not null default now()
);
alter table public.event enable row level security;
drop policy if exists "event baca" on public.event;
create policy "event baca" on public.event for select to authenticated
  using (status = 'tampil' or public.is_admin());
drop policy if exists "event kelola admin" on public.event;
create policy "event kelola admin" on public.event for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.pendaftaran_event (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  anak_ids uuid[] not null default '{}',
  anak_nama text[] not null default '{}',
  jumlah_anak int not null default 0,
  total integer not null default 0,
  bukti_url text,
  status text not null default 'menunggu', -- menunggu | diterima | ditolak
  created_at timestamptz not null default now()
);
alter table public.pendaftaran_event enable row level security;
drop policy if exists "pendaftaran baca" on public.pendaftaran_event;
create policy "pendaftaran baca" on public.pendaftaran_event for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin());
drop policy if exists "pendaftaran insert sendiri" on public.pendaftaran_event;
create policy "pendaftaran insert sendiri" on public.pendaftaran_event for insert to authenticated
  with check (ortu_id = auth.uid());
drop policy if exists "pendaftaran update admin" on public.pendaftaran_event;
create policy "pendaftaran update admin" on public.pendaftaran_event for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Izinkan user (authenticated) mengunggah bukti bayar ke folder bukti/ di bucket aset
drop policy if exists "aset unggah bukti user" on storage.objects;
create policy "aset unggah bukti user" on storage.objects for insert to authenticated
  with check (bucket_id = 'aset' and (storage.foldername(name))[1] = 'bukti');
