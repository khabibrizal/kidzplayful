-- 0096_slot_konsultasi_setelah_bayar.sql
--
-- ATURAN BARU (keputusan pemilik): **slot/kuota konsultasi baru terpakai sesudah dibayar.**
-- Sebelum ini, booking apa pun langsung berstatus 'menunggu' dan ikut dihitung oleh
-- `sisa_kuota_konsultasi`, sehingga siapa pun — termasuk anak tanpa langganan — bisa
-- menahan slot psikolog tanpa pernah membayar. Yang belum dibayar sekarang hanya DRAFT.
--
-- Yang dianggap MEMAKAI slot (`konsultasi_memakai_slot`):
--   * status 'diterima' (sudah diverifikasi admin/psikolog), ATAU
--   * status 'menunggu'/'menunggu_bayar' yang **totalnya 0** (kuota gratis paket atau
--     diskon member 100% — memang tak ada yang perlu dibayar), ATAU
--   * status 'menunggu'/'menunggu_bayar' yang **sudah punya bukti transfer**.
-- Draft tanpa bukti: tidak memakai slot, dan hangus sendiri setelah batas bayar lewat
-- (dievaluasi saat dibaca — aplikasi ini tak punya cron).
--
-- KONSEKUENSI YANG DISENGAJA: beberapa orang tua bisa membuat draft pada tanggal yang
-- sama, dan yang lebih dulu MEMBAYAR yang mendapat slotnya. Karena itu pemeriksaan kuota
-- tak cukup di RPC booking saja — ada TRIGGER yang memeriksa ulang tepat pada saat sebuah
-- baris mulai memakai slot (bukti diunggah / diverifikasi), termasuk bila jalurnya lewat
-- REST langsung. Tanpa trigger itu, "bayar dulu" hanya sopan santun UI, bukan aturan.
--
-- Idempoten: create or replace + drop trigger if exists.

-- 1) Satu definisi "memakai slot", dipakai penghitung kuota DAN trigger ----------
create or replace function public.konsultasi_memakai_slot(
  p_status text, p_total int, p_bukti text
) returns boolean language sql immutable set search_path = public as $$
  select case
    when p_status = 'diterima' then true
    when p_status in ('menunggu', 'menunggu_bayar')
      then coalesce(p_total, 0) = 0 or p_bukti is not null
    else false
  end;
$$;
revoke execute on function public.konsultasi_memakai_slot(text, int, text) from anon;

-- 2) Kuota harian psikolog: hanya hitung yang benar-benar memakai slot ----------
create or replace function public.sisa_kuota_konsultasi(p_psikolog uuid, p_tanggal date)
returns int language sql security definer stable set search_path = public as $$
  select greatest(
    0,
    coalesce((select maks_per_hari from public.jadwal_psikolog where psikolog_id = p_psikolog), 0)
    - (select count(*)::int from public.pendaftaran_konsultasi
       where psikolog_id = p_psikolog and tanggal = p_tanggal
         and public.konsultasi_memakai_slot(status, total, bukti_url))
  );
$$;

-- 3) Trigger: kuota diperiksa ULANG saat baris mulai memakai slot ---------------
--    (bukti diunggah oleh ortu, atau admin/psikolog menerima sesi)
create or replace function public.cek_slot_konsultasi()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sebelum boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_sebelum := public.konsultasi_memakai_slot(old.status, old.total, old.bukti_url);
  end if;
  -- Hanya saat BERALIH menjadi pemakai slot; perubahan lain tak perlu diganggu.
  if public.konsultasi_memakai_slot(new.status, new.total, new.bukti_url) and not v_sebelum then
    if public.sisa_kuota_konsultasi(new.psikolog_id, new.tanggal) <= 0 then
      raise exception 'Kuota konsultasi tanggal % sudah penuh — slot terisi oleh yang sudah membayar. Silakan pilih tanggal lain lalu batalkan pesanan ini.', new.tanggal;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cek_slot_konsultasi on public.pendaftaran_konsultasi;
create trigger trg_cek_slot_konsultasi before insert or update on public.pendaftaran_konsultasi
  for each row execute function public.cek_slot_konsultasi();

-- 4) RPC booking: sesi berbayar lahir sebagai draft 'menunggu_bayar' -----------
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
               and status in ('menunggu','menunggu_bayar','diterima')
               -- Draft yang belum dibayar dan sudah lewat batas waktu dianggap hangus,
               -- jadi tidak mengunci ortu dari memesan ulang tanggal yang sama.
               and (status <> 'menunggu_bayar' or bukti_url is not null
                    or batas_bayar is null or batas_bayar > now())) then
    raise exception 'Anda sudah punya jadwal konsultasi dengan psikolog ini pada tanggal tersebut.';
  end if;

  -- Tarif: milik psikolog, cadangan ke bawaan global.
  v_harga := coalesce(nullif(v_jadwal.harga_konsultasi, 0),
                      (select harga_konsultasi_nominal from public.pengaturan_pembayaran where id = 1), 0);

  -- Paket anak (bila langganannya masih berjalan) → diskon member & kuota gratis.
  select p.* into v_paket
    from public.langganan_anak la
    join public.paket_langganan p on p.id = la.paket_id
   where la.anak_id = p_anak and la.aktif_sampai >= public.hari_ini_wib();
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
      if v_voucher.berlaku_dari is not null and public.hari_ini_wib() < v_voucher.berlaku_dari then
        raise exception 'Voucher belum berlaku.';
      end if;
      if v_voucher.berlaku_sampai is not null and public.hari_ini_wib() > v_voucher.berlaku_sampai then
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
     harga_dasar, diskon_persen, voucher_id, potongan_voucher, total, dari_kuota,
     status, batas_bayar)
    values (v_uid, p_psikolog, p_anak, v_nama, p_tanggal, nullif(btrim(p_keluhan), ''), nullif(btrim(p_jam), ''),
            v_harga, v_diskon, case when v_potongan > 0 then p_voucher else null end, v_potongan, v_total, v_dari_kuota,
            -- Sesi berbayar lahir sebagai DRAFT 'menunggu_bayar' berbatas waktu: slotnya
            -- belum terpakai, dan ortu bisa mengunggah bukti saat itu juga. Sesi bertotal 0
            -- (kuota paket / diskon member 100%) tetap 'menunggu' persetujuan psikolog.
            case when v_total > 0 then 'menunggu_bayar' else 'menunggu' end,
            case when v_total > 0 then now() + (24 * interval '1 hour') else null end)
    returning id into v_id;

  if v_potongan > 0 then
    insert into public.voucher_redeem (voucher_id, ortu_id, ref_tipe, ref_id, potongan)
      values (p_voucher, v_uid, 'konsultasi', v_id, v_potongan);
  end if;

  return v_id;
end;
$$;
grant execute on function public.daftar_konsultasi(uuid, uuid, date, text, text, uuid) to authenticated;
