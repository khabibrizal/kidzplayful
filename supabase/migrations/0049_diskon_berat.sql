-- 0049_diskon_berat.sql — harga diskon per-produk (trial & langganan) + berat, diskon event (langganan)
alter table public.produk add column if not exists harga_diskon_trial int;
alter table public.produk add column if not exists harga_diskon_langganan int;
alter table public.produk add column if not exists berat_gram int;

-- diskon event hanya untuk pelanggan aktif
alter table public.event add column if not exists harga_langganan int;
