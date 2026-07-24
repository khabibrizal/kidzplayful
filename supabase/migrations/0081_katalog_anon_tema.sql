-- 0081_katalog_anon_tema.sql — izinkan baca anon katalog tema & paket (untuk halaman teaser publik /coba/*).
drop policy if exists "tema baca anon" on public.tema;
create policy "tema baca anon" on public.tema for select to anon using (status = 'disetujui');

drop policy if exists "paket baca anon" on public.paket_aset;
create policy "paket baca anon" on public.paket_aset for select to anon using (status = 'disetujui');
