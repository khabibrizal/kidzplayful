-- supabase/migrations/0022_katalog_anon.sql
-- Izinkan baca KATALOG publik oleh role anon (untuk cache lintas-user via unstable_cache).
-- Hanya baris publik (status tampil/aktif). Data privat (anak/pesanan/pendaftaran/dll) TIDAK terpengaruh.

drop policy if exists "event baca anon" on public.event;
create policy "event baca anon" on public.event for select to anon using (status = 'tampil');

drop policy if exists "produk baca anon" on public.produk;
create policy "produk baca anon" on public.produk for select to anon using (status = 'tampil');

drop policy if exists "kelas baca anon" on public.kelas_bermain;
create policy "kelas baca anon" on public.kelas_bermain for select to anon using (status = 'aktif');
