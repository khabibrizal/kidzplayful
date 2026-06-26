import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';
const COLS = 'id,judul,aktivitas,bahan,cara_membuat,langkah,link_ide,worksheet_url,status';

export async function getKelasAktif(): Promise<KelasBermain[]> {
  const s = await createClient();
  const { data } = await s.from('kelas_bermain').select(COLS).eq('status', 'aktif').order('created_at', { ascending: false });
  return (data ?? []) as unknown as KelasBermain[];
}
export async function getKelasSemua(): Promise<KelasBermain[]> {
  const s = await createClient();
  const { data } = await s.from('kelas_bermain').select(COLS).order('created_at', { ascending: false });
  return (data ?? []) as unknown as KelasBermain[];
}
