-- supabase/migrations/0031_mesin_jalur.sql
-- Izinkan mesin game 'jalur' (Arah & Jalur / Robot Grid) di paket_aset.
alter table public.paket_aset drop constraint if exists paket_aset_mesin_check;
alter table public.paket_aset add constraint paket_aset_mesin_check
  check (mesin in ('tekan-sesuai','seret-wadah','cari-pasangan','telusuri','pop','tuang','irama','mewarnai','dekode','urutan','jalur'));
