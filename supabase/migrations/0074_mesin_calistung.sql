-- 0074_mesin_calistung.sql — daftarkan 3 mesin calistung ke CHECK constraint paket_aset.mesin
-- (sukukata = Rangkai Suku Kata, jiplak = Jiplak Huruf & Angka, hitung-benda = Hitung Benda)
alter table public.paket_aset drop constraint if exists paket_aset_mesin_check;
alter table public.paket_aset add constraint paket_aset_mesin_check
  check (mesin in ('tekan-sesuai','seret-wadah','cari-pasangan','telusuri','pop','tuang','irama','mewarnai','dekode','urutan','jalur','hitung','cocokkan','ejakata','garis','sukukata','jiplak','hitung-benda'));
