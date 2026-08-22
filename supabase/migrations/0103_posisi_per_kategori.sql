-- 0103_posisi_per_kategori.sql — posisi kurikulum unik PER KATEGORI USIA, urutan 1..4.
--
-- Koreksi atas 0102: keunikannya dulu global `(bulan_kurikulum, urutan)`, sehingga kategori
-- Bayi dan Prasekolah saling merebut slot — padahal keduanya kurikulum yang BERBEDA.
-- Keputusan pemilik: penomoran dihitung per kategori usia, urutan 1..4 = minggu ke-1..4,
-- dan yang kelima pindah ke bulan berikutnya urutan 1.
--
-- Idempoten. Aman dijalankan baik 0102 sudah pernah berhasil maupun belum.

-- 1) Buang indeks global lama (bila ada) --------------------------------------
drop index if exists public.kelas_kurikulum_posisi;

-- 2) Nomori ulang PER KATEGORI: bulan 1 urutan 1..4, lalu bulan 2, dst. --------
--    Urutannya menghormati penataan yang sudah ada (`bulan_kurikulum`, lalu `urutan`),
--    baru `created_at` & `id` sebagai pemutus — jadi hasilnya deterministik dan materi
--    yang sudah sengaja ditata tak teracak.
--    `coalesce(kategori_usia_id, uuid nol)` menjadikan materi TANPA kategori satu kelompok
--    tersendiri; tanpa itu tiap NULL dianggap unik dan aturannya bocor untuk mereka.
with berurut as (
  select id,
         row_number() over (
           partition by coalesce(kategori_usia_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by bulan_kurikulum, urutan, created_at, id
         ) as n
    from public.kelas_bermain
   where status = 'aktif'
)
update public.kelas_bermain k
   set bulan_kurikulum = ((b.n - 1) / 4) + 1,     -- 4 tema per bulan
       urutan          = ((b.n - 1) % 4) + 1      -- 1..4, tak pernah 0 atau 5
  from berurut b
 where k.id = b.id;

-- 3) Kunci posisinya per kategori ---------------------------------------------
--    Tetap HANYA untuk materi aktif (alasan sama seperti 0102: materi nonaktif harus bisa
--    "diparkir" tanpa menahan slot).
create unique index if not exists kelas_kurikulum_posisi_kategori
  on public.kelas_bermain (
    coalesce(kategori_usia_id, '00000000-0000-0000-0000-000000000000'::uuid),
    bulan_kurikulum,
    urutan
  )
  where status = 'aktif';

-- Sesudah ini tiap kategori usia punya penomorannya sendiri: Bayi bulan 1 minggu 1..4,
-- Prasekolah bulan 1 minggu 1..4, dan seterusnya. Periksa hasilnya di /admin/kelas-bermain.
