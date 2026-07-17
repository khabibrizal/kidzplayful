-- 0073_konsultasi_jam.sql
-- Booking konsultasi kini menyimpan JAM; RPC daftar_konsultasi memastikan jam dalam
-- window jadwal psikolog (selain hari & kuota yang sudah divalidasi).
alter table public.pendaftaran_konsultasi add column if not exists jam text;

drop function if exists public.daftar_konsultasi(uuid, uuid, date, text);

create or replace function public.daftar_konsultasi(
  p_psikolog uuid, p_anak uuid, p_tanggal date, p_keluhan text, p_jam text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_nama text;
  v_jadwal public.jadwal_psikolog;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Tidak terautentikasi'; end if;

  select nama into v_nama from public.anak where id = p_anak and ortu_id = v_uid;
  if v_nama is null then raise exception 'Anak tidak valid.'; end if;

  select * into v_jadwal from public.jadwal_psikolog where psikolog_id = p_psikolog;
  if v_jadwal.psikolog_id is null or not v_jadwal.aktif then
    raise exception 'Psikolog belum membuka jadwal konsultasi.';
  end if;
  if not (extract(dow from p_tanggal)::int = any (v_jadwal.hari_buka)) then
    raise exception 'Psikolog tidak buka pada hari tersebut.';
  end if;
  -- jam wajib dalam window jadwal (bila window diset)
  if v_jadwal.jam_mulai is not null and v_jadwal.jam_selesai is not null then
    if p_jam is null or btrim(p_jam) = '' then
      raise exception 'Pilih jam konsultasi dulu.';
    end if;
    if p_jam < v_jadwal.jam_mulai or p_jam > v_jadwal.jam_selesai then
      raise exception 'Jam di luar jadwal psikolog (% - %).', v_jadwal.jam_mulai, v_jadwal.jam_selesai;
    end if;
  end if;
  if public.sisa_kuota_konsultasi(p_psikolog, p_tanggal) <= 0 then
    raise exception 'Kuota konsultasi pada tanggal tersebut sudah penuh.';
  end if;
  if exists (select 1 from public.pendaftaran_konsultasi
             where ortu_id = v_uid and psikolog_id = p_psikolog and tanggal = p_tanggal
               and status in ('menunggu','diterima')) then
    raise exception 'Anda sudah punya jadwal konsultasi dengan psikolog ini pada tanggal tersebut.';
  end if;

  insert into public.pendaftaran_konsultasi (ortu_id, psikolog_id, anak_id, anak_nama, tanggal, keluhan, jam)
    values (v_uid, p_psikolog, p_anak, v_nama, p_tanggal, nullif(btrim(p_keluhan), ''), nullif(btrim(p_jam), ''))
    returning id into v_id;
  return v_id;
end;
$$;
