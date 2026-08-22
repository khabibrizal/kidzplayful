-- 0102_kurikulum_posisi_unik.sql — satu posisi kurikulum hanya milik satu tema.
--
-- Keputusan pemilik: bila bulan ke-1 urutan ke-1 sudah terisi, tema lain tak boleh memakai
-- posisi yang sama. Tanpa ini, "Minggu ke-N" yang diturunkan dari urutan (lihat
-- `posisiTema` di domain/kurikulum.ts) jadi ambigu — dua tema akan mengaku minggu yang sama
-- dan urutan tampilnya bergantung pada id, bukan pada niat admin.
--
-- HANYA untuk materi AKTIF. Materi nonaktif sengaja dibiarkan bebas: ia tak tampil ke
-- siapa pun, dan mengunci posisinya akan membuat admin tak bisa "memarkir" tema lama untuk
-- digantikan tema baru di slot yang sama. Konsekuensinya: MENGAKTIFKAN kembali tema lama
-- bisa ditolak bila posisinya sudah diambil — itu benar, dan pesannya menyebutkan jalan
-- keluarnya.
--
-- Idempoten. Bila migrasi GAGAL karena data yang ada sudah bentrok, rapikan dulu posisinya
-- di /admin/kelas-bermain (peringatan "Bulan N: x tema" sudah menunjukkan bulan mana yang
-- perlu diperiksa), lalu jalankan ulang.
create unique index if not exists kelas_kurikulum_posisi
  on public.kelas_bermain (bulan_kurikulum, urutan)
  where status = 'aktif';
