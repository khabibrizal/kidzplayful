-- supabase/migrations/0027_reschedule.sql
-- Reschedule pendaftaran event: pindahkan pendaftaran ke event aktif lain
-- (mis. anak sakit H-1 → ikut kelas bermain berikutnya), simpan event asal + alasan.

alter table public.pendaftaran_event
  add column if not exists event_asal_id uuid references public.event(id) on delete set null;
alter table public.pendaftaran_event
  add column if not exists alasan_reschedule text;
