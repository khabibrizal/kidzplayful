// src/lib/data/game-hasil.ts — ringkasan hasil game seorang anak per PAKET game.
//
// Dipakai halaman Catatan Tema: guru/psikolog menanggapi evaluasi orang tua, dan untuk itu
// perlu tahu apakah game yang menempel pada aktivitas tema itu benar-benar dimainkan.
import { createClient } from '@/lib/supabase/server';

export interface RingkasGame {
  jumlahMain: number;
  totalBintang: number;
  tercepatDetik: number | null;
  selesai: number;
  terakhir: string | null;
}

/**
 * Peta `paket_id → ringkasan`. Paket yang **tak pernah dimainkan sama sekali tidak muncul
 * di peta** — itulah bentuk "null"-nya, dan pemanggil menampilkannya sebagai "belum
 * dimainkan". Mengembalikan nol-nol untuk paket yang tak pernah disentuh akan terbaca
 * seolah anak sudah mencoba lalu gagal.
 */
export async function getRingkasGameAnak(
  anakId: string, paketIds: string[],
): Promise<Record<string, RingkasGame>> {
  const out: Record<string, RingkasGame> = {};
  const ids = [...new Set(paketIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const s = await createClient();
  const { data, error } = await s.from('hasil_main')
    .select('paket_id,bintang,durasi_detik,selesai,tanggal')
    .eq('anak_id', anakId).in('paket_id', ids);
  // Kolom/policy belum ada (migrasi 0044/0100) → peta kosong: layar berkata "belum
  // dimainkan", bukan mati.
  if (error) return out;

  for (const r of data ?? []) {
    const pid = r.paket_id as string | null;
    if (!pid) continue;
    const g = out[pid] ?? { jumlahMain: 0, totalBintang: 0, tercepatDetik: null, selesai: 0, terakhir: null };
    g.jumlahMain++;
    g.totalBintang += Math.max(0, Math.floor(Number(r.bintang) || 0));
    if (r.selesai) g.selesai++;
    const durasi = Math.max(0, Math.floor(Number(r.durasi_detik) || 0));
    // Waktu tercepat hanya dihitung dari sesi yang SELESAI — sesi yang ditinggal di tengah
    // punya durasi kecil dan akan tampak sebagai rekor palsu.
    if (r.selesai && durasi > 0 && (g.tercepatDetik === null || durasi < g.tercepatDetik)) g.tercepatDetik = durasi;
    const tgl = r.tanggal as string;
    if (!g.terakhir || tgl > g.terakhir) g.terakhir = tgl;
    out[pid] = g;
  }
  return out;
}
