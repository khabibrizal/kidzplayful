-- 0093_kegiatan_anak.sql — catatan kegiatan mandiri per ANAK (Ide Bermain & video).
--
-- KENAPA TABEL BARU, bukan memakai `riwayat_kelas`: tabel itu berkunci `(ortu_id, kelas_id)`
-- dan hanya menyimpan waktu TERAKHIR. Jadi ia bukan per anak dan bukan riwayat — mustahil
-- dipakai untuk rapor "setiap anak, setiap aktivitasnya". `aktivitas` (0046) juga tak cukup:
-- isinya hanya nama fitur untuk analitik, tanpa rujukan materi apa yang dikerjakan.
create table if not exists public.kegiatan_anak (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  jenis text not null check (jenis in ('ide-bermain','video')),
  ref_id uuid,                    -- kelas_bermain.id / video.id (boleh null bila terhapus)
  judul text,                     -- SNAPSHOT: rapor tetap terbaca bila materinya diubah/dihapus
  waktu timestamptz not null default now()
);
create index if not exists idx_kegiatan_anak_anak on public.kegiatan_anak(anak_id, waktu desc);
create index if not exists idx_kegiatan_anak_ortu on public.kegiatan_anak(ortu_id, waktu desc);

alter table public.kegiatan_anak enable row level security;

-- Ortu pemilik + admin/guru/psikolog yang memang berhak melihat laporan anak itu
-- (memakai ulang fungsi 0066 supaya aturan aksesnya satu pintu).
drop policy if exists "kegiatan anak baca" on public.kegiatan_anak;
create policy "kegiatan anak baca" on public.kegiatan_anak for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
         or public.boleh_lihat_laporan_anak(anak_id));

drop policy if exists "kegiatan anak catat sendiri" on public.kegiatan_anak;
create policy "kegiatan anak catat sendiri" on public.kegiatan_anak for insert to authenticated
  with check (ortu_id = auth.uid()
              and exists (select 1 from public.anak a where a.id = anak_id and a.ortu_id = auth.uid()));

-- Tak ada UPDATE/DELETE untuk ortu: rapor tidak boleh bisa "dirapikan" belakangan.
drop policy if exists "kegiatan anak kelola admin" on public.kegiatan_anak;
create policy "kegiatan anak kelola admin" on public.kegiatan_anak for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
