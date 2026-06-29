-- supabase/migrations/0018_riwayat_kelas.sql
-- Riwayat kelas bermain yang pernah dibuka/diikuti user (per akun ortu).

create table if not exists public.riwayat_kelas (
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  kelas_id uuid not null references public.kelas_bermain(id) on delete cascade,
  terakhir timestamptz not null default now(),
  primary key (ortu_id, kelas_id)
);
alter table public.riwayat_kelas enable row level security;
drop policy if exists "riwayat milik sendiri" on public.riwayat_kelas;
create policy "riwayat milik sendiri" on public.riwayat_kelas for all to authenticated
  using (ortu_id = auth.uid()) with check (ortu_id = auth.uid());
