-- 0056_roles_superuser.sql — role Super User + perketat proteksi role (Fase manajemen user)
-- Role sekarang: is_superuser (tertinggi), is_admin, is_guru, is_investor.

alter table public.profiles add column if not exists is_superuser boolean not null default false;

create or replace function public.is_superuser()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select p.is_superuser from public.profiles p where p.id = auth.uid()), false);
$$;

-- Perketat trigger anti eskalasi:
--  * is_admin & is_superuser hanya boleh diubah oleh SUPER USER (atau via SQL/service role saat auth.uid() null)
--  * is_guru & is_investor boleh diubah oleh ADMIN atau SUPER USER
--  * user biasa tidak bisa mengubah role apa pun pada dirinya (menutup celah is_investor)
create or replace function public.cegah_self_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not public.is_superuser() then
      new.is_admin := old.is_admin;
      new.is_superuser := old.is_superuser;
    end if;
    if not (public.is_admin() or public.is_superuser()) then
      new.is_guru := old.is_guru;
      new.is_investor := old.is_investor;
    end if;
  end if;
  return new;
end;
$$;

-- Super user juga boleh baca & update profil orang lain (untuk kelola user)
drop policy if exists "admin baca profiles" on public.profiles;
create policy "admin baca profiles" on public.profiles for select to authenticated
  using (public.is_admin() or public.is_superuser());
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update to authenticated
  using (public.is_admin() or public.is_superuser()) with check (public.is_admin() or public.is_superuser());

-- Bootstrap super user pertama (ganti email lalu jalankan sekali):
-- update public.profiles set is_superuser = true, is_admin = true where email = 'admin@kidzplayful.app';
