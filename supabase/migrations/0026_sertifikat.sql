-- supabase/migrations/0026_sertifikat.sql
-- E-Sertifikat kelas bermain: absensi kehadiran per anak, template JPEG + link
-- dokumentasi per event, dan tabel sertifikat (snapshot) yang tampil di Rapor anak.

-- 1) Event: template sertifikat (JPEG) + link dokumentasi kegiatan.
alter table public.event add column if not exists sertifikat_bg_url text;
alter table public.event add column if not exists dokumentasi_url text;

-- 2) Absensi per anak di baris pendaftaran (anak_id yang HADIR).
alter table public.pendaftaran_event
  add column if not exists hadir_anak_ids uuid[] not null default '{}';

-- 3) Sertifikat (snapshot agar tetap valid walau event/anak berubah).
--    1 sertifikat per (event, anak) => upsert idempoten via unique.
create table if not exists public.sertifikat (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.event(id) on delete set null,
  anak_id uuid not null references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  anak_nama text not null,        -- snapshot nama anak
  event_judul text not null,      -- snapshot judul event
  event_tanggal date,             -- snapshot tanggal event
  lokasi text,                    -- snapshot lokasi event
  bg_url text,                    -- snapshot template JPEG event
  dokumentasi_url text,           -- snapshot link dokumentasi event
  diterbitkan_oleh text,          -- nama/email admin (snapshot)
  created_at timestamptz not null default now(),
  unique (event_id, anak_id)
);
alter table public.sertifikat enable row level security;

drop policy if exists "sertifikat baca" on public.sertifikat;
create policy "sertifikat baca" on public.sertifikat for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin());

drop policy if exists "sertifikat kelola admin" on public.sertifikat;
create policy "sertifikat kelola admin" on public.sertifikat for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
