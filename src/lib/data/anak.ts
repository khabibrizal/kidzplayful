// src/lib/data/anak.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Guard halaman anak (`/main`, `/ortu`, `/pilih-game`): pastikan login + anak memang
 * milik ortu yang login (RLS yang menegakkannya), lalu kembalikan barisnya.
 *
 * ⚠️ SENGAJA TIDAK memeriksa langganan lagi (bug "klik profil anak tidak membuka
 * halaman anak"). Dulu fungsi ini me-redirect DIAM-DIAM ke `/pilih-anak` begitu status
 * bukan aktif/trial/tenggang — jadi begitu masa trial ortu habis, mengetuk kartu anak
 * terasa seperti tombol rusak: layar hanya kembali ke halaman yang sama tanpa pesan.
 *
 * Dua alasan gerbang itu dicabut, bukan sekadar diberi pesan:
 *  1. Ketiga halaman yang dijaganya SUDAH punya penguncian per konten
 *     (`dibatasiTrial` → `boleh_trial` → 🔒 + ajakan perpanjang di `Terkunci`).
 *     Selama gerbang ini ada, cabang kunci itu tak pernah bisa tampil untuk status
 *     `kadaluarsa` — user dipantulkan sebelum sempat melihatnya.
 *  2. Gerbangnya juga menyalakan diri karena sebab yang BUKAN kedaluwarsa: baris
 *     `langganan` yang hilang atau ganda membuat `.single()` gagal, lalu statusnya
 *     dianggap 'kadaluarsa' dan ortu terkunci dari anaknya sendiri tanpa sebab.
 *
 * Rapor, catatan, dan sertifikat memang tidak pernah dijaga gerbang ini.
 */
export async function getAnakTerjamin(anakId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // maybeSingle: baris tak ada / tak terbaca RLS = null tanpa error 406.
  const { data: anak } = await supabase
    .from('anak').select('id,nama,mode_default,batas_menit,koin,tanggal_lahir')
    .eq('id', anakId).maybeSingle();
  // Alasan dibawa di query string supaya `/pilih-anak` bisa MENJELASKAN, bukan sekadar
  // memantulkan diam-diam seperti sebelumnya.
  if (!anak) redirect('/pilih-anak?galat=anak-tidak-ditemukan');

  return anak;
}
