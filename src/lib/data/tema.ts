// src/lib/data/tema.ts
import { createClient } from '@/lib/supabase/server';
import type { Paket } from '@/lib/game/tipe';

export async function getMingguIni() {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul').eq('is_minggu_ini', true).limit(1).single();
  if (!tema) return null;
  const { data: paket } = await supabase
    .from('paket_aset')
    .select('id,mesin,judul,area_skill,butir')
    .eq('tema_id', tema.id).eq('status', 'disetujui').order('urutan');
  return { tema, paket: (paket ?? []) as unknown as Paket[] };
}
