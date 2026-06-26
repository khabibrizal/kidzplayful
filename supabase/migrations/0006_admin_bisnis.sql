-- supabase/migrations/0006_admin_bisnis.sql
create policy "admin baca profiles" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "admin baca anak" on public.anak
  for select to authenticated using (public.is_admin());
create policy "admin baca langganan" on public.langganan
  for select to authenticated using (public.is_admin());
create policy "admin baca hasil" on public.hasil_main
  for select to authenticated using (public.is_admin());
create policy "admin update langganan" on public.langganan
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
