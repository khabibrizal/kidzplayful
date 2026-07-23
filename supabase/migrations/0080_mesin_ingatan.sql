-- 0080_mesin_ingatan.sql — daftarkan mesin game 'ingatan' (memory/concentration) ke CHECK constraint.
alter table public.paket_aset drop constraint if exists paket_aset_mesin_check;
alter table public.paket_aset add constraint paket_aset_mesin_check
  check (mesin in ('tekan-sesuai','seret-wadah','cari-pasangan','telusuri','pop','tuang','irama','mewarnai','dekode','urutan','jalur','hitung','cocokkan','ejakata','garis','sukukata','jiplak','hitung-benda','ingatan'));
