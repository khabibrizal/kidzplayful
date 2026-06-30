-- supabase/migrations/0020_catatan_perkembangan.sql
-- Role Guru + Catatan Perkembangan Bermain (rubrik PAUD per anak per event).

-- 1) Kolom & helper role guru
alter table public.profiles add column if not exists is_guru boolean not null default false;

create or replace function public.is_guru()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select p.is_guru from public.profiles p where p.id = auth.uid()), false);
$$;

-- 2) Cegah user biasa promote diri jadi admin/guru; admin tetap boleh mengubah role.
create or replace function public.cegah_self_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.is_guru := old.is_guru;
  end if;
  return new;
end;
$$;

-- admin boleh update profil orang lain (untuk set/cabut is_guru via "Kelola Guru")
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3) Guru boleh baca event & pendaftaran (untuk lihat peserta)
drop policy if exists "event baca" on public.event;
create policy "event baca" on public.event for select to authenticated
  using (status = 'tampil' or public.is_admin() or public.is_guru());

drop policy if exists "pendaftaran baca" on public.pendaftaran_event;
create policy "pendaftaran baca" on public.pendaftaran_event for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin() or public.is_guru());

-- 4) Tabel catatan perkembangan
create table if not exists public.catatan_perkembangan (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event(id) on delete cascade,
  anak_id uuid not null references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  aspek jsonb not null default '{}',   -- {fisik_motorik:'BSH', sosial_emosional:'MB', kognitif:'BSH', bahasa:'BSB'}
  catatan text,
  dinilai_oleh text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, anak_id)
);
alter table public.catatan_perkembangan enable row level security;
drop policy if exists "catatan baca" on public.catatan_perkembangan;
create policy "catatan baca" on public.catatan_perkembangan for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin() or public.is_guru());
drop policy if exists "catatan insert guru" on public.catatan_perkembangan;
create policy "catatan insert guru" on public.catatan_perkembangan for insert to authenticated
  with check (public.is_guru());
drop policy if exists "catatan update guru" on public.catatan_perkembangan;
create policy "catatan update guru" on public.catatan_perkembangan for update to authenticated
  using (public.is_guru()) with check (public.is_guru());
