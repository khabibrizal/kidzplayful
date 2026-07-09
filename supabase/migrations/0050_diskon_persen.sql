-- 0050_diskon_persen.sql — diskon berupa PERSENTASE (menggantikan harga diskon nominal 0049)
alter table public.produk add column if not exists diskon_trial_persen int;
alter table public.produk add column if not exists diskon_langganan_persen int;
alter table public.event add column if not exists diskon_langganan_persen int;
-- kolom nominal 0049 (harga_diskon_*) tidak lagi dipakai; boleh dibiarkan.
