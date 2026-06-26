-- supabase/migrations/0007_storage_aset.sql
insert into storage.buckets (id, name, public)
values ('aset', 'aset', true)
on conflict (id) do nothing;

create policy "aset baca publik" on storage.objects
  for select using (bucket_id = 'aset');
create policy "aset unggah admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'aset' and public.is_admin());
create policy "aset hapus admin" on storage.objects
  for delete to authenticated using (bucket_id = 'aset' and public.is_admin());
