-- 0100_guru_baca_hasil_main.sql — guru boleh membaca hasil game anak.
--
-- Kenapa perlu: Catatan Tema (0099) adalah RESPONS guru/psikolog atas evaluasi yang diisi
-- orang tua. Untuk menanggapinya dengan tepat, guru perlu melihat hasil game yang menempel
-- pada aktivitas tema itu — kalau anaknya memang memainkannya. Tanpa policy ini, laporan
-- game selalu kosong untuk guru dan catatannya jadi tebakan.
--
-- Cakupannya: `hasil_main` sudah bisa dibaca ortu pemilik (0002), admin (0006), dan
-- psikolog yang menangani anak itu (0066). Guru ditambahkan dengan cakupan yang sama
-- luasnya dengan hak guru yang sudah ada (`pendaftaran_event`, `catatan_perkembangan`,
-- `evaluasi_kurikulum`) — yaitu semua anak, bukan hanya peserta eventnya. Guru di aplikasi
-- ini memang peran internal, bukan wali kelas per rombongan.
--
-- HANYA SELECT: guru tak boleh menulis/mengubah skor anak.
drop policy if exists "hasil guru baca" on public.hasil_main;
create policy "hasil guru baca" on public.hasil_main for select to authenticated
  using (public.is_guru());
