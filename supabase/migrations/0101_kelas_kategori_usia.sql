-- 0101_kelas_kategori_usia.sql — Ide Bermain memilih KATEGORI USIA, seperti Game.
--
-- Meniru pola 0079 (paket_aset) apa adanya supaya keduanya berperilaku sama:
--   • `kategori_usia_id` = kategori yang dipilih admin (nullable — materi lama tetap sah);
--   • `usia_min`/`usia_max` TETAP ADA dan di-SNAPSHOT dari rentang kategori saat disimpan.
--
-- Kenapa rentangnya tetap di-snapshot, bukan selalu di-join ke master: penyaringan usia
-- anak (`cocokUsia`) membaca `usia_min/max` di banyak tempat, dan mengubah rentang sebuah
-- kategori di master tak boleh diam-diam mengubah materi yang sudah tayang. Snapshot juga
-- membuat pembacaan katalog tetap satu query.
alter table public.kelas_bermain
  add column if not exists kategori_usia_id uuid references public.kategori_usia(id) on delete set null;
create index if not exists kelas_kategori_usia_idx on public.kelas_bermain(kategori_usia_id);

-- Isi kategori untuk materi lama yang rentang usianya SAMA PERSIS dengan sebuah kategori.
-- Yang tak cocok persis dibiarkan kosong: menebak kategori dari rentang yang mirip akan
-- mengubah arti data admin tanpa ia tahu. Materi tanpa kategori tetap tersaring benar,
-- karena `usia_min/max`-nya memang masih terisi.
update public.kelas_bermain k
   set kategori_usia_id = ku.id
  from public.kategori_usia ku
 where k.kategori_usia_id is null
   and k.usia_min = ku.usia_min
   and k.usia_max = ku.usia_max;
