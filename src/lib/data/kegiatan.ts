// src/lib/data/kegiatan.ts — baca kegiatan mandiri anak (Ide Bermain & video).
//
// TOLERAN: tabel `kegiatan_anak` (migrasi 0093) mungkin belum ada saat kode ini tayang →
// daftar kosong, dan rapor tetap menampilkan bagian lainnya.
import { createClient } from '@/lib/supabase/server';
import type { KegiatanRingkas } from '@/lib/domain/laporan-bulanan';

export interface Kegiatan extends KegiatanRingkas { id: string; ref_id: string | null }

/** Kegiatan seorang anak dalam rentang waktu (ISO). Tanpa rentang = 200 terbaru. */
export async function getKegiatanAnak(
  anakId: string, rentang?: { dari: string; sampai: string },
): Promise<Kegiatan[]> {
  const s = await createClient();
  let q = s.from('kegiatan_anak').select('id,jenis,ref_id,judul,waktu').eq('anak_id', anakId);
  if (rentang) q = q.gte('waktu', rentang.dari).lt('waktu', rentang.sampai);
  const { data, error } = await q.order('waktu', { ascending: false }).limit(rentang ? 500 : 200);
  if (error) return [];
  return (data ?? []) as unknown as Kegiatan[];
}
