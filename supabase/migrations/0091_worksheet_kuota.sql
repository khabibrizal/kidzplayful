-- 0091_worksheet_kuota.sql — kuota unduh worksheet per paket (pola yang sama dengan
-- kuota konsultasi gratis), plus log unduhan sebagai dasar hitungannya.
--
-- Kenapa butuh LOG: tanpa catatan unduhan, "kuota" hanya hiasan di layar — tombolnya tetap
-- tautan biasa yang bisa diklik berulang. Unduhan sekarang melewati server action yang
-- memeriksa sisa kuota lalu mencatatnya.

-- 1) Kuota pada paket ---------------------------------------------------------
--    Arti nilainya (ditulis eksplisit karena mudah tertukar):
--      worksheet = false            → tidak bisa mengunduh sama sekali
--      worksheet = true,  kuota = 0 → TANPA BATAS
--      worksheet = true,  kuota > 0 → maksimal N unduhan per satuan
alter table public.paket_langganan
  add column if not exists worksheet_kuota_jumlah int not null default 0;
alter table public.paket_langganan
  add column if not exists worksheet_kuota_satuan text not null default 'bulan'
  check (worksheet_kuota_satuan in ('bulan','langganan'));

-- 2) Log unduhan --------------------------------------------------------------
--    Dicatat per ORTU (bukan per anak): satu berkas worksheet dipakai bersama di rumah,
--    dan tombolnya juga muncul di halaman yang tak punya konteks anak (/kelas/[id]).
create table if not exists public.unduhan_worksheet (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  kelas_id uuid references public.kelas_bermain(id) on delete set null,
  judul text,                                  -- snapshot, agar riwayat tetap terbaca
  waktu timestamptz not null default now()
);
create index if not exists idx_unduhan_worksheet_ortu on public.unduhan_worksheet(ortu_id, waktu desc);

alter table public.unduhan_worksheet enable row level security;
drop policy if exists "unduhan worksheet baca" on public.unduhan_worksheet;
create policy "unduhan worksheet baca" on public.unduhan_worksheet for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin());
drop policy if exists "unduhan worksheet catat sendiri" on public.unduhan_worksheet;
create policy "unduhan worksheet catat sendiri" on public.unduhan_worksheet for insert to authenticated
  with check (ortu_id = auth.uid());
-- Tak ada policy UPDATE/DELETE untuk ortu: riwayat unduhan tidak boleh dihapus sendiri,
-- kalau tidak kuotanya bisa direset dengan menghapus barisnya.
drop policy if exists "unduhan worksheet kelola admin" on public.unduhan_worksheet;
create policy "unduhan worksheet kelola admin" on public.unduhan_worksheet for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3) Nilai awal yang masuk akal untuk paket bawaan ---------------------------
--    Basic: boleh unduh tapi TERBATAS (3 per bulan) — permintaan pemilik "tidak semua".
--    Preschool: tanpa batas.
update public.paket_langganan
   set worksheet = true, worksheet_kuota_jumlah = 3, worksheet_kuota_satuan = 'bulan'
 where kode = 'basic' and worksheet_kuota_jumlah = 0 and worksheet = false;
update public.paket_langganan
   set worksheet_kuota_jumlah = 0
 where kode = 'preschool';
