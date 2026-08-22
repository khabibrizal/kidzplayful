// src/lib/data/catatan-tema.ts — catatan perkembangan per TEMA (admin/guru/psikolog).
//
// Terpisah dari `evaluasi_kurikulum` (checklist orang tua) karena berbeda penulis dan
// berbeda bobot sebagai bukti — lihat 0099.
import { createClient } from '@/lib/supabase/server';

export interface NilaiTema { area: string; indikator: string; nilai: string }

export interface CatatanTema {
  id: string;
  anak_id: string;
  kelas_id: string;
  penulis_id: string;
  peran: 'admin' | 'guru' | 'psikolog';
  penilaian: NilaiTema[];
  catatan: string;
  updated_at: string;
  penulis_nama: string | null;
}

const COLS = 'id,anak_id,kelas_id,penulis_id,peran,penilaian,catatan,updated_at,penulis:penulis_id(nama_tampilan,email)';

function petakan(rows: unknown[]): CatatanTema[] {
  return (rows ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const p = Array.isArray(r.penulis) ? r.penulis[0] : r.penulis;
    const nm = p as { nama_tampilan?: string | null; email?: string | null } | null;
    return {
      id: r.id as string,
      anak_id: r.anak_id as string,
      kelas_id: r.kelas_id as string,
      penulis_id: r.penulis_id as string,
      peran: r.peran as CatatanTema['peran'],
      penilaian: (r.penilaian as NilaiTema[]) ?? [],
      catatan: (r.catatan as string) ?? '',
      updated_at: r.updated_at as string,
      penulis_nama: nm?.nama_tampilan?.trim() || nm?.email || null,
    };
  });
}

/** Semua catatan tema milik satu anak (terbaru dulu) — untuk rapor & halaman penulis. */
export async function getCatatanTemaAnak(anakId: string): Promise<CatatanTema[]> {
  const s = await createClient();
  const { data, error } = await s.from('catatan_tema').select(COLS)
    .eq('anak_id', anakId).order('updated_at', { ascending: false });
  if (error) return [];   // tabel belum ada (0099 belum dijalankan)
  return petakan(data ?? []);
}

/**
 * Catatan pada satu tema untuk satu anak, MILIK PENULIS yang sedang login.
 *
 * Sengaja tidak mengembalikan catatan penulis lain: form hanya boleh mengisi ulang
 * tulisannya sendiri (kunci unik 0099 = anak+kelas+penulis). Menampilkan catatan orang
 * lain di kotak edit akan membuat guru mengira sedang menyunting miliknya.
 */
export async function getCatatanTemaSaya(anakId: string, kelasId: string): Promise<CatatanTema | null> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data, error } = await s.from('catatan_tema').select(COLS)
    .eq('anak_id', anakId).eq('kelas_id', kelasId).eq('penulis_id', user.id).maybeSingle();
  if (error || !data) return null;
  return petakan([data])[0] ?? null;
}
