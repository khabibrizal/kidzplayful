-- 0086_event_kuota.sql — kuota peserta per kelas pada event + RPC hitung kuota terpakai.
-- null / 0 = tanpa batas.
alter table public.event
  add column if not exists kuota_baby int,
  add column if not exists kuota_toddler int,
  add column if not exists kuota_gabungan int;

-- Kuota terpakai (jumlah ANAK) per kelas untuk sebuah event.
-- SECURITY DEFINER: user biasa hanya boleh membaca pendaftarannya sendiri (RLS),
-- padahal untuk sisa kuota ia butuh agregat semua pendaftar. Yang dikembalikan
-- hanya ANGKA per kelas — tak ada data pribadi yang bocor.
-- Pendaftaran 'ditolak' tidak dihitung (kuota kembali saat admin menolak).
create or replace function public.kuota_terpakai_event(p_event_id uuid)
returns table (kelas text, anak int)
language sql
stable
security definer
set search_path = public
as $$
  select case when pe.kelas in ('baby', 'toddler') then pe.kelas else 'gabungan' end as kelas,
         coalesce(sum(coalesce(pe.jumlah_anak, coalesce(array_length(pe.anak_ids, 1), 0))), 0)::int as anak
  from public.pendaftaran_event pe
  where pe.event_id = p_event_id
    and pe.status <> 'ditolak'
  group by 1;
$$;

grant execute on function public.kuota_terpakai_event(uuid) to authenticated, anon;
