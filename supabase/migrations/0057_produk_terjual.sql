-- 0057_produk_terjual.sql — counter terjual + flag pemotongan stok idempoten
alter table public.produk add column if not exists terjual int not null default 0;
alter table public.pesanan add column if not exists stok_terpotong boolean not null default false;

-- Backfill jumlah terjual dari pesanan yang sudah dikonfirmasi (diproses/dikirim/selesai)
update public.produk p set terjual = coalesce(sub.n, 0)
from (
  select ip.produk_id, sum(ip.qty)::int as n
  from public.item_pesanan ip
  join public.pesanan o on o.id = ip.pesanan_id
  where o.status in ('diproses','dikirim','selesai') and ip.produk_id is not null
  group by ip.produk_id
) sub
where p.id = sub.produk_id;

-- Tandai pesanan yang sudah dikonfirmasi agar tidak dipotong ulang di masa depan.
-- (Stok tidak diubah retroaktif untuk menghindari pemotongan ganda pada pesanan
--  yang stoknya mungkin sudah dikurangi kode lama.)
update public.pesanan set stok_terpotong = true where status in ('diproses','dikirim','selesai');
