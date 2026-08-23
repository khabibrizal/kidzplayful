-- 0105_kelas_jenis.sql — materi Ide Bermain dibedakan: TEMA kurikulum vs materi EVENT.
--
-- Keputusan pemilik: satu tempat untuk menyusun materi, dua peruntukan yang berbeda.
--
--   'tema'  → materi kurikulum. Tampil ke orang tua/anak, dan MENEMPATI satu posisi
--             (bulan ke-N, minggu ke-M) di kategori usianya.
--   'event' → bahan untuk event offline. Disiapkan admin, TIDAK tampil di Ide Bermain, dan
--             TIDAK menempati posisi kurikulum mana pun. Sesudah event-nya selesai, materinya
--             bisa DIDUPLIKAT menjadi tema baru — dan salinan itulah yang menempati posisi.
--
-- Kenapa satu tabel, bukan tabel baru: seluruh bentuk materinya identik (aktivitas, bahan,
-- butir evaluasi, worksheet, sampul), begitu pula form dan aksi adminnya. Tabel kedua berarti
-- dua salinan dari semua itu, dan fitur duplikat event→tema justru akan menyeberangi tabel.
alter table public.kelas_bermain
  add column if not exists jenis text not null default 'tema';

-- CHECK dipasang terpisah & idempoten: `add column if not exists` tak menambahkan constraint
-- bila kolomnya sudah ada dari percobaan sebelumnya.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'kelas_bermain_jenis_check'
  ) then
    alter table public.kelas_bermain
      add constraint kelas_bermain_jenis_check check (jenis in ('tema', 'event'));
  end if;
end $$;

create index if not exists kelas_bermain_jenis_idx on public.kelas_bermain(jenis);

-- Posisi kurikulum HANYA berlaku untuk 'tema' -----------------------------------
-- Indeks 0103 mengunci (kategori, bulan, minggu) untuk semua materi aktif. Tanpa penyaring
-- `jenis`, materi event akan MENEMPATI slot kurikulum — padahal ia tak pernah tampil ke
-- siapa pun. Akibatnya admin kehabisan minggu di sebuah bulan tanpa alasan yang terlihat.
drop index if exists public.kelas_kurikulum_posisi_kategori;
create unique index if not exists kelas_kurikulum_posisi_kategori
  on public.kelas_bermain (
    coalesce(kategori_usia_id, '00000000-0000-0000-0000-000000000000'::uuid),
    bulan_kurikulum,
    urutan
  )
  where status = 'aktif' and jenis = 'tema';

-- Materi event tak punya posisi kurikulum: `bulan_kurikulum = 0` adalah cara yang SUDAH
-- dipahami seluruh kode sebagai "tanpa posisi" (`posisiTema` & `statusTema` memeriksa
-- `bulan < 1`). Tak ada baris event saat migrasi ini dijalankan — kolomnya baru — jadi ini
-- hanya penjaga bila ada yang menyusul lewat jalur lain.
update public.kelas_bermain set bulan_kurikulum = 0, urutan = 0
 where jenis = 'event' and (bulan_kurikulum <> 0 or urutan <> 0);
