-- 0063_pengaturan_menu.sql — akses menu admin per role (diatur super user)
-- akses = { admin: [key...], investor: [key...], guru: [key...] }. Super user selalu full.
create table if not exists public.pengaturan_menu (
  id int primary key default 1 check (id = 1),
  akses jsonb not null default '{}'::jsonb,   -- default per-role diisi di kode (DEFAULT_AKSES)
  updated_at timestamptz not null default now()
);
-- (bila tabel sudah pernah dibuat versi lama) pastikan kolom akses ada
alter table public.pengaturan_menu add column if not exists akses jsonb not null default '{}'::jsonb;
insert into public.pengaturan_menu (id) values (1) on conflict (id) do nothing;

alter table public.pengaturan_menu enable row level security;
drop policy if exists "baca pengaturan menu" on public.pengaturan_menu;
create policy "baca pengaturan menu" on public.pengaturan_menu for select to authenticated using (true);
drop policy if exists "superuser ubah pengaturan menu" on public.pengaturan_menu;
create policy "superuser ubah pengaturan menu" on public.pengaturan_menu for update to authenticated
  using (public.is_superuser()) with check (public.is_superuser());
