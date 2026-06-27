-- supabase/migrations/0015_favorit.sql
-- Tambah No WhatsApp di profil + tabel favorit kelas bermain (per akun ortu).

alter table public.profiles add column if not exists no_wa text;

create table if not exists public.favorit (
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  kelas_id uuid not null references public.kelas_bermain(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ortu_id, kelas_id)
);

alter table public.favorit enable row level security;

drop policy if exists "favorit milik sendiri" on public.favorit;
create policy "favorit milik sendiri" on public.favorit
  for all to authenticated
  using (ortu_id = auth.uid())
  with check (ortu_id = auth.uid());
