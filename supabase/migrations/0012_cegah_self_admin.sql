-- supabase/migrations/0012_cegah_self_admin.sql
-- Cegah user biasa mempromosikan dirinya jadi admin lewat update profil sendiri.
-- Saat ada sesi user (auth.uid() tidak null), kolom is_admin dipaksa tetap nilai lama.
-- Perubahan is_admin HANYA bisa via SQL Editor / service role (auth.uid() null).
create or replace function public.cegah_self_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_cegah_self_admin on public.profiles;
create trigger profiles_cegah_self_admin
  before update on public.profiles
  for each row execute function public.cegah_self_admin();
