// src/lib/data/riwayat-kelas.ts — riwayat kelas bermain yang pernah dibuka user
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';

const COLS = 'id,judul,aktivitas,bahan,link_ide,worksheet_url,status';

/** Catat/segarkan riwayat saat user membuka sebuah kelas bermain. Diam saja bila belum login. */
export async function rekamRiwayat(kelasId: string): Promise<void> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return;
  await s.from('riwayat_kelas').upsert(
    { ortu_id: user.id, kelas_id: kelasId, terakhir: new Date().toISOString() },
    { onConflict: 'ortu_id,kelas_id' },
  );
}

/** Daftar kelas bermain yang pernah dibuka, terbaru di atas. */
export async function getRiwayatKelas(): Promise<KelasBermain[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s
    .from('riwayat_kelas')
    .select(`terakhir, kelas:kelas_id(${COLS})`)
    .eq('ortu_id', user.id)
    .order('terakhir', { ascending: false });
  return (data ?? [])
    .map((r) => (Array.isArray(r.kelas) ? r.kelas[0] : r.kelas))
    .filter(Boolean) as unknown as KelasBermain[];
}
