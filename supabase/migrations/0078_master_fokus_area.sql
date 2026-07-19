-- 0078_master_fokus_area.sql — master data Fokus Area Perkembangan (dipakai form Kelas Bermain).
-- kelas_bermain.fokus_area text[] menyimpan `key` dari master ini.
create table if not exists public.fokus_area (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,      -- slug stabil, disimpan di kelas_bermain.fokus_area
  label text not null,           -- teks tampil (boleh ber-emoji), mis. "✋ Motorik Halus"
  urutan int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.fokus_area enable row level security;
drop policy if exists "fokus area baca" on public.fokus_area;
create policy "fokus area baca" on public.fokus_area for select to authenticated
  using (true);
drop policy if exists "fokus area kelola admin" on public.fokus_area;
create policy "fokus area kelola admin" on public.fokus_area for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Seed 8 area bawaan (key = nilai yang sudah dipakai kelas_bermain.fokus_area)
insert into public.fokus_area (key, label, urutan) values
  ('motorik-halus',    '✋ Motorik Halus',    1),
  ('motorik-kasar',    '🏃 Motorik Kasar',    2),
  ('kognitif',         '🧠 Kognitif',         3),
  ('bahasa',           '🗣️ Bahasa',           4),
  ('sosial-emosional', '💞 Sosial-Emosional', 5),
  ('sensorik',         '🖐️ Sensorik',         6),
  ('kemandirian',      '🌟 Kemandirian',      7),
  ('kreativitas',      '🎨 Kreativitas',      8)
on conflict (key) do nothing;
