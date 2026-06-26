-- supabase/migrations/0005_video_kategori.sql
alter table public.video add column if not exists kategori text not null default 'toddler'
  check (kategori in ('baby','toddler'));
alter table public.video alter column tema_id drop not null;
update public.video set kategori = 'toddler' where kategori is null;
