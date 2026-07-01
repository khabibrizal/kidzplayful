-- supabase/migrations/0023_profil_alamat.sql
-- Alamat lengkap di profil (untuk auto-isi checkout Store). No HP pakai kolom no_wa yg sudah ada.
alter table public.profiles add column if not exists alamat text;
