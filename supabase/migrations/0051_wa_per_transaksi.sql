-- 0051_wa_per_transaksi.sql — nomor WA admin terpisah untuk Event & Store (fallback ke wa_nomor)
alter table public.pengaturan_pembayaran add column if not exists wa_event text not null default '';
alter table public.pengaturan_pembayaran add column if not exists wa_store text not null default '';
