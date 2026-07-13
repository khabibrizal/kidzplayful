-- 0062_penilaian_perkembangan.sql — parameter penilaian per event + nilai snapshot per anak
-- Parameter (area+indikator) ditetapkan admin per event; educator/admin memberi nilai per anak.

-- Parameter event (dibagikan semua anak di event itu)
alter table public.event add column if not exists indikator_perkembangan jsonb not null default '[]'::jsonb;
-- Snapshot nilai per anak: array {area, indikator, nilai}
alter table public.catatan_perkembangan add column if not exists penilaian jsonb not null default '[]'::jsonb;

-- Perluas RLS agar ADMIN juga boleh mengisi/mengubah catatan (kini hanya guru)
drop policy if exists "catatan insert guru" on public.catatan_perkembangan;
create policy "catatan insert guru" on public.catatan_perkembangan for insert to authenticated
  with check (public.is_guru() or public.is_admin());
drop policy if exists "catatan update guru" on public.catatan_perkembangan;
create policy "catatan update guru" on public.catatan_perkembangan for update to authenticated
  using (public.is_guru() or public.is_admin()) with check (public.is_guru() or public.is_admin());
