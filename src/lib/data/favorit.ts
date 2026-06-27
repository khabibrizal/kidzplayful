// src/lib/data/favorit.ts
// Lapisan baca favorit (per akun ortu).
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';

const COLS = 'id,judul,aktivitas,bahan,cara_membuat,langkah,link_ide,worksheet_url,status';

/** Daftar id kelas bermain yang difavoritkan ortu yang sedang login. */
export async function getFavoritIds(): Promise<string[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s.from('favorit').select('kelas_id').eq('ortu_id', user.id);
  return (data ?? []).map((x) => x.kelas_id as string);
}

/** Kelas bermain favorit (aktif) untuk ditampilkan di dashboard. */
export async function getFavoritKelas(): Promise<KelasBermain[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s
    .from('favorit')
    .select(`kelas:kelas_id(${COLS})`)
    .eq('ortu_id', user.id)
    .order('created_at', { ascending: false });
  return (data ?? [])
    .map((r) => (Array.isArray(r.kelas) ? r.kelas[0] : r.kelas))
    .filter((k) => k && (k as { status?: string }).status === 'aktif') as unknown as KelasBermain[];
}
