// src/lib/data/game-pilihan.ts — daftar game untuk dropdown "game per aktivitas" (admin).
//
// Admin memilihkan game yang cocok untuk sebuah aktivitas Ide Bermain, dan boleh TIDAK
// memilih. Nama tema + area skill ikut ditampilkan supaya kecocokannya bisa dinilai tanpa
// membuka halaman game satu per satu.
import { createClient } from '@/lib/supabase/server';

export interface OpsiGame { id: string; judul: string; area_skill: string; tema: string }

/** Semua paket game yang disetujui, bergrup per tema (urut tema lalu judul). */
export async function getOpsiGame(): Promise<OpsiGame[]> {
  const s = await createClient();
  const { data, error } = await s.from('paket_aset')
    .select('id,judul,area_skill,tema:tema_id(nama)')
    .eq('status', 'disetujui').order('judul');
  if (error) return [];
  const out = (data ?? []).map((r) => {
    const t = Array.isArray(r.tema) ? r.tema[0] : r.tema;
    return {
      id: r.id as string,
      judul: (r.judul as string) ?? 'Tanpa judul',
      area_skill: (r.area_skill as string) ?? '-',
      tema: (t as { nama?: string } | null)?.nama ?? 'Tanpa tema',
    };
  });
  return out.sort((a, b) => a.tema.localeCompare(b.tema) || a.judul.localeCompare(b.judul));
}
