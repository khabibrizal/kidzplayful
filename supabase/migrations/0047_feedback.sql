-- 0047_feedback.sql — masukan/feedback aplikasi dari orang tua
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  rating int check (rating between 1 and 5),
  pesan text not null,
  dibuat_at timestamptz not null default now()
);
create index if not exists idx_feedback_waktu on public.feedback(dibuat_at desc);

alter table public.feedback enable row level security;
-- user kirim masukan miliknya sendiri
drop policy if exists "kirim feedback sendiri" on public.feedback;
create policy "kirim feedback sendiri" on public.feedback
  for insert to authenticated with check (ortu_id = auth.uid());
-- admin baca semua
drop policy if exists "admin baca feedback" on public.feedback;
create policy "admin baca feedback" on public.feedback
  for select to authenticated using (public.is_admin());
