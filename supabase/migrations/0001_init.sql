-- supabase/migrations/0001_init.sql

-- profil orang tua (1-1 dengan auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  pin_ortu text,                       -- 4 digit, di-set belakangan
  terakhir_aktif timestamptz,
  created_at timestamptz not null default now()
);

create table public.anak (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  nama text not null,
  tanggal_lahir date not null,
  mode_default text not null default 'anak' check (mode_default in ('ortu','anak')),
  batas_menit int not null default 20,
  koin int not null default 0,
  created_at timestamptz not null default now()
);
create index anak_ortu_idx on public.anak(ortu_id);

create table public.langganan (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial','aktif','menunggu','tenggang','kadaluarsa')),
  nominal int not null default 0,
  trial_mulai date not null default current_date,
  trial_selesai date not null default (current_date + 14),
  aktif_sampai date,
  dibayar_via text,
  diaktifkan_oleh uuid,
  updated_at timestamptz not null default now()
);

-- trigger: saat user baru daftar -> buat profile + langganan trial
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.langganan (ortu_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.anak enable row level security;
alter table public.langganan enable row level security;

create policy "profil milik sendiri" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "anak milik ortu" on public.anak
  for all using (auth.uid() = ortu_id) with check (auth.uid() = ortu_id);

create policy "langganan milik ortu (baca)" on public.langganan
  for select using (auth.uid() = ortu_id);
