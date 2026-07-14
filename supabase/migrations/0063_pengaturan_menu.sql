-- 0063_pengaturan_menu.sql — daftar menu admin yang KHUSUS super user (admin biasa tak boleh)
create table if not exists public.pengaturan_menu (
  id int primary key default 1 check (id = 1),
  super_only jsonb not null default '["keuangan","users","pengaturan-bayar","pengaturan-trial","sponsor"]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.pengaturan_menu (id) values (1) on conflict (id) do nothing;

alter table public.pengaturan_menu enable row level security;
drop policy if exists "baca pengaturan menu" on public.pengaturan_menu;
create policy "baca pengaturan menu" on public.pengaturan_menu for select to authenticated using (true);
drop policy if exists "superuser ubah pengaturan menu" on public.pengaturan_menu;
create policy "superuser ubah pengaturan menu" on public.pengaturan_menu for update to authenticated
  using (public.is_superuser()) with check (public.is_superuser());
