// src/lib/data/panduan.ts
import { createClient } from '@/lib/supabase/server';
import type { TemaPanduan, Panduan } from '@/lib/game/tipe';

export async function getModeOrtu(): Promise<TemaPanduan[]> {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul,is_minggu_ini').eq('status', 'disetujui')
    .order('is_minggu_ini', { ascending: false }).order('created_at');
  if (!tema) return [];
  const ids = tema.map((t) => t.id);
  const { data: pan } = await supabase
    .from('panduan').select('tema_id,judul,aktivitas,bahan,cara_membuat,langkah,worksheet_url,link_ide').in('tema_id', ids);
  const map = new Map((pan ?? []).map((p) => [p.tema_id, p as unknown as Panduan]));
  return tema.map((t) => ({
    tema: { id: t.id, nama: t.nama, sampul: t.sampul, is_minggu_ini: t.is_minggu_ini },
    panduan: map.get(t.id) ?? null,
  }));
}

export async function getKelasBermain(temaId: string): Promise<Panduan | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('panduan').select('tema_id,judul,aktivitas,bahan,cara_membuat,langkah,worksheet_url,link_ide')
    .eq('tema_id', temaId).maybeSingle();
  return (data as unknown as Panduan) ?? null;
}
