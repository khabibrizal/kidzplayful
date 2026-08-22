-- 0102_kurikulum_posisi_unik.sql — satu posisi kurikulum hanya milik satu tema.
--
-- Keputusan pemilik: bila bulan ke-1 urutan ke-1 sudah terisi, tema lain tak boleh memakai
-- posisi yang sama. Tanpa ini, "Minggu ke-N" yang diturunkan dari urutan (lihat
-- `posisiTema` di domain/kurikulum.ts) jadi ambigu — dua tema akan mengaku minggu yang sama
-- dan urutan tampilnya bergantung pada id, bukan pada niat admin.
--
-- ⚠️ VERSI PERTAMA MIGRASI INI GAGAL, dan itu memang seharusnya: seluruh materi lama
-- memakai nilai bawaan `(bulan_kurikulum, urutan) = (1, 0)`, jadi indeks uniknya ditolak
-- ("Key (bulan_kurikulum, urutan)=(1, 0) is duplicated"). Kegagalan itu aman — tak ada
-- yang berubah setengah jalan. Karena itu langkah 1 di bawah MERAPIKAN posisinya lebih
-- dulu, dan barulah indeksnya dibuat.

-- 1) Nomori ulang urutan tema AKTIF di dalam tiap bulan: 0, 1, 2, … ------------
--    Urutannya mengikuti nilai yang sudah ada dulu (`urutan`), lalu `created_at` — jadi
--    penataan yang SUDAH sengaja dibuat admin tetap dihormati, dan yang sama-sama 0
--    dinomori menurut usia materinya. Deterministik: `id` sebagai pemutus terakhir supaya
--    hasilnya tak berubah bila dijalankan ulang.
with berurut as (
  select id,
         (row_number() over (partition by bulan_kurikulum order by urutan, created_at, id) - 1) as baru
    from public.kelas_bermain
   where status = 'aktif'
)
update public.kelas_bermain k
   set urutan = b.baru
  from berurut b
 where k.id = b.id
   and k.urutan is distinct from b.baru;

-- 2) Kunci posisinya -----------------------------------------------------------
--    HANYA untuk materi AKTIF. Materi nonaktif sengaja dibiarkan bebas: ia tak tampil ke
--    siapa pun, dan mengunci posisinya akan membuat admin tak bisa "memarkir" tema lama
--    untuk digantikan tema baru di slot yang sama. Konsekuensinya: MENGAKTIFKAN kembali
--    tema lama bisa ditolak bila posisinya sudah diambil — itu benar, dan pesan galatnya
--    (lihat `pesanGalat` di lib/data/kelas-bermain-actions.ts) menyebutkan jalan keluarnya.
create unique index if not exists kelas_kurikulum_posisi
  on public.kelas_bermain (bulan_kurikulum, urutan)
  where status = 'aktif';

-- Sesudah ini, semua tema aktif di bulan 1 bernomor 0,1,2,3,… — periksa & atur ulang
-- urutannya sesuai keinginan di /admin/kelas-bermain bila hasil penomorannya belum pas.
