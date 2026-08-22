-- 0104_kurikulum_mulai.sql — jam kurikulum: tanggal siklus pertama dimulai.
--
-- Sebelum ini, "bulan kurikulum" seorang anak = `langganan_anak.bulan_kurikulum`, yaitu
-- JUMLAH BULAN YANG SUDAH DIBAYAR. Akibatnya dua hal keliru:
--
--   1. Membayar 12 bulan sekaligus menaikkan penghitung itu +12 SEKETIKA, jadi 12 bulan
--      kurikulum (48 tema) terbuka di hari yang sama. Kadensa "4 tema per bulan" tak
--      berlaku bagi pelanggan tahunan.
--   2. Tak ada titik acuan untuk MEMBEKUKAN kategori usia sepanjang satu siklus. Umur anak
--      dihitung ulang setiap halaman dibuka, sehingga ulang tahun di tengah bulan langsung
--      mengganti daftar temanya.
--
-- Kolom ini menyediakan acuan itu: tanggal (WIB) saat siklus PERTAMA anak dimulai. Dari satu
-- tanggal ini semuanya bisa dihitung tanpa cron dan tanpa penulisan berkala:
--   • siklus ke-n dimulai `kurikulum_mulai + (n-1) bulan`;
--   • siklus berjalan = min(bulan kalender yang sudah lewat, bulan yang sudah dibayar)
--     — jadi kalender menahan pelanggan tahunan, dan bayaran menahan yang berhenti;
--   • kategori usia dibekukan dari umur anak PADA AWAL siklus berjalan, bukan hari ini.
--
-- `bulan_kurikulum` TIDAK dibuang: ia tetap dipakai sebagai batas "sudah dibayar berapa
-- bulan". Yang berubah hanya artinya di layar — ia bukan lagi nomor bulan yang tampil.

alter table public.langganan_anak
  add column if not exists kurikulum_mulai date;

-- Backfill: baris yang sudah ada dianggap mulai pada `updated_at`-nya. Ini PERKIRAAN —
-- `langganan_anak` tak punya `created_at`, jadi tanggal aktivasi pertama memang tak tersimpan.
-- Dipilih `updated_at` (bukan hari ini) supaya anak yang sudah lama berlangganan tak
-- terlempar kembali ke siklus 1; dan `least(...)` menjaga agar tak pernah melampaui
-- `aktif_sampai` dikurangi bulan yang sudah dibayar, yang akan membuat siklusnya melompat.
update public.langganan_anak
   set kurikulum_mulai = least(
         (updated_at at time zone 'Asia/Jakarta')::date,
         coalesce(aktif_sampai, (updated_at at time zone 'Asia/Jakarta')::date)
       )
 where kurikulum_mulai is null;

-- Sesudah ini, aktivasi berikutnya (`setPaketAnak`) mengisi kolom ini hanya bila MASIH
-- kosong — jam kurikulum dimulai sekali, dan perpanjangan tak boleh mengulangnya dari awal.
