-- supabase/migrations/0034_stiker.sql
-- Stiker nama per event: template gambar stiker (nama anak + judul kelas dioverlay).
alter table public.event add column if not exists stiker_bg_url text;
