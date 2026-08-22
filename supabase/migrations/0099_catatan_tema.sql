-- 0099_catatan_tema.sql — catatan perkembangan PER TEMA oleh admin/guru/psikolog.
--
-- Idempoten. Dijalankan MANUAL di Supabase SQL Editor setelah deploy; pembacanya toleran
-- (tabel belum ada → daftar kosong, bukan galat).
--
-- Kenapa tabel sendiri, bukan menumpang `evaluasi_kurikulum` (0098): checklist orang tua
-- dan catatan naratif profesional berbeda bentuk (centang vs kalimat + rubrik), berbeda
-- penulis, dan berbeda BOBOT sebagai bukti. Satu tabel berarti satu baris yang ditimpa oleh
-- siapa pun yang menyimpan paling akhir — guru menghapus penilaian orang tua tanpa ada yang
-- tahu.
--
-- Fungsi yang dipakai policy di bawah sudah ada dan diverifikasi:
--   public.is_guru()                       (0020)
--   public.is_psikolog()                   (0064)
--   public.boleh_lihat_laporan_anak(uuid)  (0066 — psikolog TER-SCOPE ke anak yang punya
--                                           konsultasi diterima/selesai dengannya)

create table if not exists public.catatan_tema (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  kelas_id uuid not null references public.kelas_bermain(id) on delete cascade,
  penulis_id uuid not null references public.profiles(id) on delete cascade,
  peran text not null check (peran in ('admin','guru','psikolog')),
  -- [{area, indikator, nilai}] — skala PAUD (BB/MB/BSH/BSB), area disarankan dari
  -- `kelas_bermain.fokus_area` tema itu. Bentuknya sengaja SAMA dengan
  -- `catatan_perkembangan.penilaian` (0062) supaya rapor bisa merendernya dengan kode yang sama.
  penilaian jsonb not null default '[]'::jsonb,
  catatan text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- `penulis_id` IKUT di kunci: guru dan psikolog boleh menulis pada tema yang sama tanpa
  -- saling menimpa; menyimpan ulang hanya menimpa catatan MILIKNYA SENDIRI.
  unique (anak_id, kelas_id, penulis_id)
);
create index if not exists catatan_tema_anak_idx on public.catatan_tema(anak_id, updated_at desc);

alter table public.catatan_tema enable row level security;

-- Baca: ortu pemilik, admin, psikolog yang MENANGANI anak itu (0066), dan guru.
drop policy if exists "catatan tema baca" on public.catatan_tema;
create policy "catatan tema baca" on public.catatan_tema for select to authenticated
  using (public.boleh_lihat_laporan_anak(anak_id) or public.is_guru());

-- Tulis: hanya sebagai DIRI SENDIRI (`penulis_id = auth.uid()`) dan hanya oleh peran
-- profesional. Tanpa syarat penulis_id, seorang guru bisa menuliskan catatan atas nama
-- psikolog — dan rapor menyebut nama penulis, jadi itu bukan detail kecil.
drop policy if exists "catatan tema tulis" on public.catatan_tema;
create policy "catatan tema tulis" on public.catatan_tema for insert to authenticated
  with check (
    penulis_id = auth.uid()
    and (public.is_admin() or public.is_guru() or public.is_psikolog())
    and (public.boleh_lihat_laporan_anak(anak_id) or public.is_guru())
  );

drop policy if exists "catatan tema ubah" on public.catatan_tema;
create policy "catatan tema ubah" on public.catatan_tema for update to authenticated
  using (penulis_id = auth.uid()) with check (penulis_id = auth.uid());

-- TIDAK ADA policy DELETE: catatan perkembangan adalah rekam jejak, bukan draf.
-- Pembersihan lewat SQL Editor bila benar-benar perlu.
