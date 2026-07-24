-- 0082_atribusi_share.sql — atribusi pendaftar dari share konten.
alter table public.profiles
  add column if not exists ref_sumber text,   -- 'share' | null (organik)
  add column if not exists ref_saluran text,  -- whatsapp|facebook|twitter|telegram|salin|native
  add column if not exists ref_jenis text;    -- artikel|kelas|game
create index if not exists profiles_ref_sumber_idx on public.profiles(ref_sumber);
