// src/lib/data/worksheet-actions.ts — minta URL worksheet (memeriksa & memakai kuota).
'use server';
import { createClient } from '@/lib/supabase/server';
import { getStatusWorksheet, type StatusWorksheet } from './worksheet';

export interface HasilWorksheet {
  ok: boolean;
  url?: string;
  /** sisa kuota SETELAH unduhan ini (null = tanpa batas) */
  sisa?: number | null;
  error?: string;
}

/**
 * Berikan URL worksheet sebuah materi bila hak & kuotanya cukup, lalu catat unduhannya.
 *
 * URUTAN GERBANGNYA PENTING, dan versi sebelumnya salah urutan:
 *
 *   1. **hak akun** diperiksa lebih dulu. Sebelumnya `worksheet_terbuka` diperiksa PALING
 *      AWAL dan langsung mengembalikan URL, sehingga siapa pun yang login — termasuk yang
 *      sama sekali bukan pelanggan — bisa mengunduh materi bertanda itu. Penanda "contoh
 *      gratis" hanya boleh membebaskan dari KUOTA, bukan dari keanggotaan;
 *   2. **trial** dibatasi satu unduhan seumur trial, dan `worksheet_terbuka` pun MEMAKAI
 *      jatah itu — kalau tidak, trial mendapat unduhan tanpa batas lewat pintu itu;
 *   3. **member** memakai kuota paketnya, dan `worksheet_terbuka` bebas kuota seperti dulu.
 */
/**
 * Kalimat penolakan yang MENYEBUT sebabnya. Tiga keadaan yang berbeda tak boleh berbagi satu
 * pesan: "belum berlangganan", "jatah trial habis", dan "kuota paket habis" menuntut tindakan
 * yang berbeda dari orang tua.
 */
function pesanTolak(status: StatusWorksheet): string {
  if (status.mode === 'tidak') {
    return 'Unduh worksheet hanya untuk pelanggan. Pilih paket langganan dulu ya 🌿';
  }
  if (status.mode === 'trial') {
    return `Masa trial dapat ${status.maksTrial}× unduh worksheet, dan jatahnya sudah terpakai. Berlangganan untuk unduh sepuasnya ya 🌿`;
  }
  if (status.sisa === 0 && !status.tanpaBatas) {
    return `Kuota unduh worksheet paket ${status.paketNama} sudah habis ${status.satuan === 'bulan' ? 'bulan ini' : 'untuk langganan ini'}. Naikkan paket untuk unduhan tanpa batas ya 🌿`;
  }
  return `Paket ${status.paketNama} belum termasuk unduh worksheet.`;
}

export async function mintaWorksheet(kelasId: string): Promise<HasilWorksheet> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Harus login.' };

    // Kolom `worksheet_terbuka` (0089) dibaca dengan cadangan.
    type BarisWorksheet = { judul: string | null; worksheet_url: string | null; worksheet_terbuka?: boolean | null };
    let baris: BarisWorksheet | null = null;
    {
      const coba = await s.from('kelas_bermain')
        .select('judul,worksheet_url,worksheet_terbuka').eq('id', kelasId).eq('status', 'aktif').maybeSingle();
      if (coba.error) {
        const lagi = await s.from('kelas_bermain')
          .select('judul,worksheet_url').eq('id', kelasId).eq('status', 'aktif').maybeSingle();
        baris = (lagi.data ?? null) as unknown as BarisWorksheet | null;
      } else {
        baris = (coba.data ?? null) as unknown as BarisWorksheet | null;
      }
    }
    if (!baris?.worksheet_url) return { ok: false, error: 'Worksheet tidak tersedia untuk materi ini.' };

    const status = await getStatusWorksheet();
    if (!status.boleh) return { ok: false, error: pesanTolak(status) };

    // `worksheet_terbuka` membebaskan dari KUOTA — hanya untuk member. Trial tetap memakai
    // jatah satu-kalinya, jadi pintu ini tak bisa dipakai mengunduh tanpa batas.
    const bebasKuota = status.mode === 'member' && !!baris.worksheet_terbuka;

    // Catat SEBELUM URL diberikan: kalau pencatatannya gagal, jangan berikan berkasnya —
    // kalau tidak, kuotanya bisa dilewati dengan sengaja membuat pencatatan gagal.
    if (!bebasKuota && !status.tanpaBatas) {
      const { error } = await s.from('unduhan_worksheet').insert({
        ortu_id: user.id, kelas_id: kelasId, judul: baris.judul ?? null,
      });
      if (error) return { ok: false, error: 'Gagal mencatat unduhan, coba lagi ya.' };
    }
    if (bebasKuota) return { ok: true, url: baris.worksheet_url, sisa: status.sisa ?? null };

    return {
      ok: true,
      url: baris.worksheet_url,
      sisa: status.tanpaBatas ? null : Math.max(0, (status.sisa ?? 0) - 1),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal mengambil worksheet.' };
  }
}
