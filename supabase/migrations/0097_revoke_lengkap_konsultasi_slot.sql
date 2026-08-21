-- 0097_revoke_lengkap_konsultasi_slot.sql — resep pencabutan hak yang LENGKAP.
--
-- 0096 hanya menulis `revoke execute ... from anon` untuk `konsultasi_memakai_slot`,
-- meniru pelajaran 0095 — TAPI setengah. Buktinya dari probe: fungsi itu masih bisa
-- dipanggil kunci anon (`HTTP 200 → false`). Sebabnya ada DUA pemberi izin, dan keduanya
-- harus dicabut:
--   1. `PUBLIC`  — bawaan Postgres: setiap fungsi baru bisa dieksekusi siapa pun;
--   2. peran `anon`/`authenticated` — default privileges Supabase pada skema `public`.
-- 0094+0095 kebetulan mencabut keduanya untuk `hari_ini_wib()` (satu di tiap migrasi),
-- itulah kenapa fungsi itu benar-benar tertutup sementara yang ini tidak.
--
-- Dampaknya untuk data: NOL — fungsi ini murni menghitung boolean dari argumen yang
-- dikirim pemanggilnya, tak menyentuh satu baris pun. Yang diperbaiki adalah resepnya,
-- supaya pola ini tidak disalin ke fungsi yang benar-benar menyentuh data.
revoke execute on function public.konsultasi_memakai_slot(text, int, text) from public;
revoke execute on function public.konsultasi_memakai_slot(text, int, text) from anon;

-- Pemeriksaan mandiri: pastikan 0096 memang berjalan SAMPAI SELESAI, bukan berhenti di
-- tengah. Tanpa trigger ini, "bayar dulu baru terdaftar" cuma sopan santun UI — jadi
-- lebih baik migrasi ini GAGAL BERISIK daripada membiarkan aturannya bolong tanpa tanda.
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'trg_cek_slot_konsultasi' and not tgisinternal
  ) then
    raise exception 'Trigger trg_cek_slot_konsultasi TIDAK ADA — migrasi 0096 belum lengkap. Jalankan 0096 sampai selesai lalu ulangi 0097.';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'konsultasi_memakai_slot'
  ) then
    raise exception 'Fungsi konsultasi_memakai_slot TIDAK ADA — migrasi 0096 belum dijalankan.';
  end if;
  raise notice '0096 lengkap: trigger & fungsi slot konsultasi terpasang.';
end $$;
