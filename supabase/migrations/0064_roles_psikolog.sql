-- 0064_roles_psikolog.sql — role Psikolog (fitur Chat dengan Psikolog)
-- Role sekarang: is_superuser (tertinggi), is_admin, is_guru, is_investor, is_psikolog.

alter table public.profiles add column if not exists is_psikolog boolean not null default false;

create or replace function public.is_psikolog()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select p.is_psikolog from public.profiles p where p.id = auth.uid()), false);
$$;

-- Perluas trigger anti eskalasi: is_psikolog setingkat guru/investor
--  (hanya boleh diubah oleh admin/super user; user biasa tak bisa promote diri).
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
      new.is_psikolog := old.is_psikolog;
    end if;
  end if;
  return new;
end;
$$;
