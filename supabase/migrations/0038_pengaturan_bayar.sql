-- 0038_pengaturan_bayar.sql — master konfigurasi pembayaran (dinamis, diedit admin)
-- Satu baris tunggal (id=1) berisi harga langganan + rekening/QRIS/WA transfer.

create table if not exists public.pengaturan_pembayaran (
  id int primary key default 1 check (id = 1),
  harga_langganan_nominal int not null default 35000,
  harga_langganan_teks text not null default 'Rp 35.000 / bulan',
  bank_teks text not null default 'BCA 1234567890 a.n. KidzPlayful',
  qris_url text not null default '',
  wa_nomor text not null default '6281234567890',
  updated_at timestamptz not null default now()
);

-- pastikan baris tunggal ada
insert into public.pengaturan_pembayaran (id) values (1) on conflict (id) do nothing;

alter table public.pengaturan_pembayaran enable row level security;

-- semua user terautentikasi boleh membaca (dipakai halaman /pengaturan & /pesanan)
drop policy if exists "baca pengaturan bayar" on public.pengaturan_pembayaran;
create policy "baca pengaturan bayar" on public.pengaturan_pembayaran
  for select to authenticated using (true);

-- hanya admin yang boleh mengubah
drop policy if exists "admin ubah pengaturan bayar" on public.pengaturan_pembayaran;
create policy "admin ubah pengaturan bayar" on public.pengaturan_pembayaran
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
