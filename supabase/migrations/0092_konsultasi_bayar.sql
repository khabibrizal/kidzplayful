-- 0092_konsultasi_bayar.sql — konsultasi psikolog BAYAR PER SESI + kuota gratis dari paket.
--
-- Menjawab dua hal sekaligus:
--   1) orang tua NON-MEMBER ingin berkonsultasi (hari ini halaman /konsultasi memblokir mereka);
--   2) paket langganan menjanjikan sejumlah konsultasi gratis (kolomnya sudah ada sejak 0089,
--      tapi belum berfungsi).
--
-- Uang dihitung DI DALAM fungsi SECURITY DEFINER, bukan dikirim klien: baris pendaftaran
-- konsultasi bisa di-update ortu sendiri (policy 0065), jadi nominal yang dipercaya dari
-- klien = konsultasi gratis untuk siapa pun yang tahu caranya.

-- 1) Tarif per psikolog + bawaan global ---------------------------------------
alter table public.jadwal_psikolog add column if not exists harga_konsultasi int not null default 0;
alter table public.jadwal_psikolog add column if not exists diskon_langganan_persen int;  -- null = pakai bawaan global

alter table public.pengaturan_pembayaran add column if not exists harga_konsultasi_nominal int not null default 0;
alter table public.pengaturan_pembayaran add column if not exists diskon_konsultasi_langganan_persen int not null default 100;
alter table public.pengaturan_pembayaran add column if not exists wa_konsultasi text default '';

-- 2) Kolom uang & pembayaran pada pendaftaran konsultasi ----------------------
alter table public.pendaftaran_konsultasi add column if not exists harga_dasar int not null default 0;
alter table public.pendaftaran_konsultasi add column if not exists diskon_persen int not null default 0;
alter table public.pendaftaran_konsultasi add column if not exists voucher_id uuid references public.voucher(id) on delete set null;
alter table public.pendaftaran_konsultasi add column if not exists potongan_voucher int not null default 0;
alter table public.pendaftaran_konsultasi add column if not exists total int not null default 0;
alter table public.pendaftaran_konsultasi add column if not exists bukti_url text;
alter table public.pendaftaran_konsultasi add column if not exists batas_bayar timestamptz;
alter table public.pendaftaran_konsultasi add column if not exists dibayar_pada timestamptz;
alter table public.pendaftaran_konsultasi add column if not exists dari_kuota boolean not null default false;
-- Alasan penolakan pembayaran, ditampilkan ke orang tua (pola sama dengan pendaftaran event).
alter table public.pendaftaran_konsultasi add column if not exists alasan_tolak text;

-- Status baru 'menunggu_bayar'. Menambah nilai TANPA memperbarui CHECK = UPDATE ditolak DB
-- dan galatnya ter-redact di production (pelajaran paket_aset_mesin_check).
alter table public.pendaftaran_konsultasi drop constraint if exists pendaftaran_konsultasi_status_check;
alter table public.pendaftaran_konsultasi add constraint pendaftaran_konsultasi_status_check
  check (status in ('menunggu','menunggu_bayar','diterima','ditolak','selesai','batal'));

-- 3) Voucher berlaku untuk konsultasi ----------------------------------------
alter table public.voucher add column if not exists berlaku_konsultasi boolean not null default false;
alter table public.voucher_redeem drop constraint if exists voucher_redeem_ref_tipe_check;
alter table public.voucher_redeem add constraint voucher_redeem_ref_tipe_check
  check (ref_tipe in ('pendaftaran','pesanan','langganan','konsultasi'));

-- 4) Kuota harian psikolog ikut menghitung tagihan yang belum dibayar --------
--    Tanpa ini, tagihan yang tak dibayar menyandera slot selamanya.
create or replace function public.sisa_kuota_konsultasi(p_psikolog uuid, p_tanggal date)
returns int language sql security definer stable set search_path = public as $$
  select greatest(
    0,
    coalesce((select maks_per_hari from public.jadwal_psikolog where psikolog_id = p_psikolog), 0)
    - (select count(*)::int from public.pendaftaran_konsultasi
       where psikolog_id = p_psikolog and tanggal = p_tanggal
         and (status in ('menunggu','diterima')
              or (status = 'menunggu_bayar' and (batas_bayar is null or batas_bayar > now()))))
  );
$$;

-- 5) Trigger pelindung: ortu hanya boleh menyentuh bukti_url & membatalkan ---
create or replace function public.cegah_ubah_konsultasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() = old.psikolog_id then return new; end if;
  if new.harga_dasar <> old.harga_dasar
     or new.diskon_persen <> old.diskon_persen
     or coalesce(new.voucher_id::text,'') <> coalesce(old.voucher_id::text,'')
     or new.potongan_voucher <> old.potongan_voucher
     or new.total <> old.total
     or new.dari_kuota <> old.dari_kuota
     or new.batas_bayar is distinct from old.batas_bayar
     or new.dibayar_pada is distinct from old.dibayar_pada then
    raise exception 'Hanya admin/psikolog yang boleh mengubah nominal atau status pembayaran konsultasi.';
  end if;
  -- Orang tua boleh: mengunggah bukti (status tetap) atau membatalkan sesinya.
  if new.status <> old.status and new.status <> 'batal' then
    raise exception 'Perubahan status konsultasi itu bukan hak orang tua.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cegah_ubah_konsultasi on public.pendaftaran_konsultasi;
create trigger trg_cegah_ubah_konsultasi before update on public.pendaftaran_konsultasi
  for each row execute function public.cegah_ubah_konsultasi();

-- 6) Booking: harga, diskon member, kuota paket, & voucher dihitung DI SINI --
drop function if exists public.daftar_konsultasi(uuid, uuid, date, text, text);
create or replace function public.daftar_konsultasi(
  p_psikolog uuid, p_anak uuid, p_tanggal date, p_keluhan text, p_jam text, p_voucher uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_nama text;
  v_jadwal public.jadwal_psikolog;
  v_id uuid;
  v_harga int;
  v_diskon int;
  v_paket public.paket_langganan;
  v_anak_aktif boolean := false;
  v_kuota int := 0;
  v_terpakai int := 0;
  v_dari_kuota boolean := false;
  v_subtotal int;
  v_potongan int := 0;
  v_voucher public.voucher;
  v_total int;
begin
  if v_uid is null then raise exception 'Tidak terautentikasi'; end if;

  select nama into v_nama from public.anak where id = p_anak and ortu_id = v_uid;
  if v_nama is null then raise exception 'Anak tidak valid.'; end if;

  select * into v_jadwal from public.jadwal_psikolog where psikolog_id = p_psikolog;
  if v_jadwal.psikolog_id is null or not v_jadwal.aktif then
    raise exception 'Psikolog belum membuka jadwal konsultasi.';
  end if;
  if not (extract(dow from p_tanggal)::int = any (v_jadwal.hari_buka)) then
    raise exception 'Psikolog tidak buka pada tanggal tersebut.';
  end if;
  if p_jam is null or btrim(p_jam) = '' then
    raise exception 'Pilih jam konsultasi.';
  end if;
  if v_jadwal.jam_mulai is not null and v_jadwal.jam_selesai is not null
     and (p_jam < v_jadwal.jam_mulai or p_jam > v_jadwal.jam_selesai) then
    raise exception 'Jam tersebut di luar jadwal psikolog (% - %).', v_jadwal.jam_mulai, v_jadwal.jam_selesai;
  end if;
  if public.sisa_kuota_konsultasi(p_psikolog, p_tanggal) <= 0 then
    raise exception 'Kuota konsultasi pada tanggal tersebut sudah penuh.';
  end if;
  if exists (select 1 from public.pendaftaran_konsultasi
             where ortu_id = v_uid and psikolog_id = p_psikolog and tanggal = p_tanggal
               and status in ('menunggu','menunggu_bayar','diterima')) then
    raise exception 'Anda sudah punya jadwal konsultasi dengan psikolog ini pada tanggal tersebut.';
  end if;

  -- Tarif: milik psikolog, cadangan ke bawaan global.
  v_harga := coalesce(nullif(v_jadwal.harga_konsultasi, 0),
                      (select harga_konsultasi_nominal from public.pengaturan_pembayaran where id = 1), 0);

  -- Paket anak (bila langganannya masih berjalan) → diskon member & kuota gratis.
  select p.* into v_paket
    from public.langganan_anak la
    join public.paket_langganan p on p.id = la.paket_id
   where la.anak_id = p_anak and la.aktif_sampai >= current_date;
  v_anak_aktif := v_paket.id is not null;

  if v_anak_aktif then
    v_kuota := coalesce(v_paket.konsultasi_gratis_jumlah, 0);
    if v_kuota > 0 then
      select count(*)::int into v_terpakai
        from public.pendaftaran_konsultasi
       where anak_id = p_anak and dari_kuota
         and status <> 'batal' and status <> 'ditolak'
         and (v_paket.konsultasi_gratis_satuan <> 'bulan'
              or created_at >= date_trunc('month', (now() at time zone 'Asia/Jakarta')) at time zone 'Asia/Jakarta');
      if v_terpakai < v_kuota then v_dari_kuota := true; end if;
    end if;
    v_diskon := coalesce(v_jadwal.diskon_langganan_persen,
                         (select diskon_konsultasi_langganan_persen from public.pengaturan_pembayaran where id = 1), 0);
  else
    v_diskon := 0;
  end if;
  v_diskon := greatest(0, least(100, v_diskon));

  if v_dari_kuota then
    -- Dipakai dari kuota paket: tak ada tagihan sama sekali.
    v_subtotal := 0; v_potongan := 0; v_total := 0;
  else
    v_subtotal := greatest(0, round(v_harga * (100 - v_diskon) / 100.0)::int);
    if p_voucher is not null and v_subtotal > 0 then
      select * into v_voucher from public.voucher where id = p_voucher;
      if v_voucher.id is null then raise exception 'Voucher tidak ditemukan.'; end if;
      if not v_voucher.aktif then raise exception 'Voucher tidak aktif.'; end if;
      if not coalesce(v_voucher.berlaku_konsultasi, false) then
        raise exception 'Voucher tidak berlaku untuk konsultasi.';
      end if;
      if v_voucher.berlaku_dari is not null and current_date < v_voucher.berlaku_dari then
        raise exception 'Voucher belum berlaku.';
      end if;
      if v_voucher.berlaku_sampai is not null and current_date > v_voucher.berlaku_sampai then
        raise exception 'Voucher sudah kadaluarsa.';
      end if;
      if v_voucher.kuota_total is not null
         and (select count(*) from public.voucher_redeem where voucher_id = v_voucher.id) >= v_voucher.kuota_total then
        raise exception 'Kuota voucher habis.';
      end if;
      if v_voucher.kuota_per_user is not null
         and (select count(*) from public.voucher_redeem where voucher_id = v_voucher.id and ortu_id = v_uid) >= v_voucher.kuota_per_user then
        raise exception 'Kamu sudah memakai voucher ini.';
      end if;
      v_potongan := least(
        case when v_voucher.tipe = 'persen'
             then round(v_subtotal * greatest(0, least(100, v_voucher.nilai)) / 100.0)::int
             else greatest(0, v_voucher.nilai) end,
        v_subtotal);
    end if;
    v_total := greatest(0, v_subtotal - v_potongan);
  end if;

  insert into public.pendaftaran_konsultasi
    (ortu_id, psikolog_id, anak_id, anak_nama, tanggal, keluhan, jam,
     harga_dasar, diskon_persen, voucher_id, potongan_voucher, total, dari_kuota)
    values (v_uid, p_psikolog, p_anak, v_nama, p_tanggal, nullif(btrim(p_keluhan), ''), nullif(btrim(p_jam), ''),
            v_harga, v_diskon, case when v_potongan > 0 then p_voucher else null end, v_potongan, v_total, v_dari_kuota)
    returning id into v_id;

  if v_potongan > 0 then
    insert into public.voucher_redeem (voucher_id, ortu_id, ref_tipe, ref_id, potongan)
      values (p_voucher, v_uid, 'konsultasi', v_id, v_potongan);
  end if;

  return v_id;
end;
$$;
grant execute on function public.daftar_konsultasi(uuid, uuid, date, text, text, uuid) to authenticated;
