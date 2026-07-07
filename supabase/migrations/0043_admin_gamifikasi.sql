-- 0043_admin_gamifikasi.sql — izinkan admin mengatur gamifikasi anak (streak/koin/lencana)
drop policy if exists "admin update anak" on public.anak;
create policy "admin update anak" on public.anak
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin kelola lencana" on public.lencana_anak;
create policy "admin kelola lencana" on public.lencana_anak
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
