-- 0098_kurikulum.sql — kurikulum bulanan per anak + evaluasi per aktivitas.
--
-- Idempoten. Dijalankan MANUAL di Supabase SQL Editor SETELAH deploy: kode yang tayang
-- lebih dulu membaca semua kolom di sini secara toleran, dan tema tanpa `bulan_kurikulum`
-- dianggap TERBUKA (lihat `src/lib/domain/kurikulum.ts`).

-- 1) Tema: bulan kurikulum + urutan --------------------------------------------
-- `bulan_kurikulum` ditulis EKSPLISIT per tema, bukan diturunkan dari `ceil(urutan/4)`:
-- admin harus bisa menata bulan dengan jumlah tema tak sama tanpa menyentuh kode. "4 tema
-- per bulan" adalah aturan ISI, dan pelanggarannya diperingatkan di halaman admin —
-- memaksanya di kode akan menyembunyikan tema ke-5 tanpa jejak.
alter table public.kelas_bermain add column if not exists bulan_kurikulum int not null default 1;
alter table public.kelas_bermain add column if not exists urutan int not null default 0;
create index if not exists kelas_bermain_kurikulum_idx on public.kelas_bermain(bulan_kurikulum, urutan);

-- 2) Penghitung bulan langganan per ANAK ---------------------------------------
-- Kohort mengikuti JUMLAH BULAN BERLANGGANAN, bukan tanggal kalender: bulan yang tidak
-- aktif tidak menambah hitungan. Karena itu angkanya DISIMPAN dan hanya naik di
-- `setPaketAnak` (satu-satunya tempat periode diperpanjang: admin manual DAN verifikasi
-- tagihan). Menurunkannya dari riwayat akan SALAH untuk aktivasi manual admin dan untuk
-- member lama hasil backfill 0089 — keduanya tanpa baris tagihan.
alter table public.langganan_anak add column if not exists bulan_kurikulum int not null default 0;

-- Backfill sekali: anak yang sudah punya langganan mendapat jumlah bulan dari tagihan yang
-- diterima, minimal 1. `where bulan_kurikulum = 0` menjaga migrasi ini tetap idempoten —
-- menjalankannya dua kali tidak menggandakan angka.
update public.langganan_anak la
   set bulan_kurikulum = greatest(1, coalesce((
         select sum(t.bulan)::int
           from public.tagihan_langganan_item i
           join public.tagihan_langganan t on t.id = i.tagihan_id
          where i.anak_id = la.anak_id and t.status = 'diterima'
       ), 0))
 where la.bulan_kurikulum = 0;

-- 3) Hasil checklist evaluasi per (anak, tema, peran) --------------------------
create table if not exists public.evaluasi_kurikulum (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  kelas_id uuid not null references public.kelas_bermain(id) on delete cascade,
  -- SNAPSHOT kalimatnya, bukan indeks: [{aktivitas, butir, tercapai}]. Begitu admin
  -- menyunting kalimat evaluasi, rapor bulan lalu tidak boleh berubah artinya. Pola yang
  -- sama dipakai `catatan_perkembangan.penilaian` (0062) dan `kegiatan_anak.judul` (0093).
  hasil jsonb not null default '[]'::jsonb,
  catatan text,
  dinilai_oleh text,
  peran text not null default 'ortu' check (peran in ('ortu','guru','psikolog','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- `peran` IKUT di dalam kunci: penilai boleh ortu MAUPUN guru/psikolog, dan tanpa ini
  -- checklist guru akan MENIMPA checklist orang tua pada tema yang sama — kehilangan data
  -- yang tak terlihat sampai rapor dicetak.
  unique (anak_id, kelas_id, peran)
);
create index if not exists evaluasi_kurikulum_anak_idx on public.evaluasi_kurikulum(anak_id, updated_at desc);

alter table public.evaluasi_kurikulum enable row level security;

drop policy if exists "evaluasi baca" on public.evaluasi_kurikulum;
create policy "evaluasi baca" on public.evaluasi_kurikulum for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
         or public.boleh_lihat_laporan_anak(anak_id));

drop policy if exists "evaluasi tulis" on public.evaluasi_kurikulum;
create policy "evaluasi tulis" on public.evaluasi_kurikulum for insert to authenticated
  with check (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
              or public.boleh_lihat_laporan_anak(anak_id));

drop policy if exists "evaluasi ubah" on public.evaluasi_kurikulum;
create policy "evaluasi ubah" on public.evaluasi_kurikulum for update to authenticated
  using (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
         or public.boleh_lihat_laporan_anak(anak_id))
  with check (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
              or public.boleh_lihat_laporan_anak(anak_id));

-- TIDAK ADA policy DELETE untuk ortu: riwayat rapor tak boleh dirapikan belakangan
-- (pola `kegiatan_anak`, 0093). Pembersihan lewat SQL Editor bila benar-benar perlu.
