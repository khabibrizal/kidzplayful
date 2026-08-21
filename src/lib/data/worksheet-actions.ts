// src/lib/data/worksheet-actions.ts — minta URL worksheet (memeriksa & memakai kuota).
'use server';
import { createClient } from '@/lib/supabase/server';
import { getStatusWorksheet } from './worksheet';

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
 * Materi bertanda `worksheet_terbuka` (contoh gratis yang ditetapkan admin) **tidak** memakai
 * kuota dan boleh diunduh siapa pun yang bisa membuka materinya — itulah gunanya penanda itu.
 */
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

    // Contoh gratis: lewati kuota sepenuhnya.
    if (baris.worksheet_terbuka) return { ok: true, url: baris.worksheet_url, sisa: null };

    const status = await getStatusWorksheet();
    if (!status.boleh) {
      return {
        ok: false,
        error: status.paketNama
          ? (status.sisa === 0 && !status.tanpaBatas
              ? `Kuota unduh worksheet paket ${status.paketNama} sudah habis ${status.satuan === 'bulan' ? 'bulan ini' : 'untuk langganan ini'}. Naikkan paket untuk unduhan tanpa batas ya 🌿`
              : `Paket ${status.paketNama} belum termasuk unduh worksheet.`)
          : 'Unduh worksheet tersedia untuk pelanggan. Pilih paket dulu ya 🌿',
      };
    }

    // Catat SEBELUM URL diberikan: kalau pencatatannya gagal, jangan berikan berkasnya —
    // kalau tidak, kuotanya bisa dilewati dengan sengaja membuat pencatatan gagal.
    if (!status.tanpaBatas) {
      const { error } = await s.from('unduhan_worksheet').insert({
        ortu_id: user.id, kelas_id: kelasId, judul: baris.judul ?? null,
      });
      if (error) return { ok: false, error: 'Gagal mencatat unduhan, coba lagi ya.' };
    }

    return {
      ok: true,
      url: baris.worksheet_url,
      sisa: status.tanpaBatas ? null : Math.max(0, (status.sisa ?? 0) - 1),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal mengambil worksheet.' };
  }
}
