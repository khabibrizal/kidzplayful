-- 0072_konsultasi_durasi.sql
-- Durasi konsultasi per sesi: psikolog set durasi (menit) di jadwal; saat sesi dimulai,
-- dimulai_pada + durasi_menit disimpan di pendaftaran (untuk hitung mundur & auto-selesai).
alter table public.jadwal_psikolog
  add column if not exists durasi_menit int not null default 0;

alter table public.pendaftaran_konsultasi
  add column if not exists dimulai_pada timestamptz,
  add column if not exists durasi_menit int not null default 0;
