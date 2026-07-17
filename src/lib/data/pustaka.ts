// src/lib/data/pustaka.ts
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TemaLengkap, Paket, Video } from '@/lib/game/tipe';

export async function getPustaka(): Promise<TemaLengkap[]> {
  const supabase = await createClient();
  return getPustakaDengan(supabase);
}

/** Varian yang menerima client dari pemanggil (dipakai REST API mobile — token-scoped). */
export async function getPustakaDengan(supabase: SupabaseClient): Promise<TemaLengkap[]> {
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul,is_minggu_ini,boleh_trial')
    .eq('status', 'disetujui')
    .order('is_minggu_ini', { ascending: false })
    .order('created_at');
  if (!tema) return [];

  const ids = tema.map((t) => t.id);
  const { data: paket } = await supabase
    .from('paket_aset')
    .select('id,tema_id,mesin,judul,area_skill,usia_min,usia_max,target_detik,butir')
    .in('tema_id', ids).eq('status', 'disetujui').order('urutan');
  const { data: video } = await supabase
    .from('video')
    .select('id,tema_id,judul,youtube_id,durasi_detik')
    .in('tema_id', ids).order('urutan');

  return tema.map((t) => ({
    tema: { id: t.id, nama: t.nama, sampul: t.sampul, is_minggu_ini: t.is_minggu_ini, boleh_trial: t.boleh_trial ?? true },
    paket: ((paket ?? []).filter((p) => p.tema_id === t.id)) as unknown as Paket[],
    video: ((video ?? []).filter((v) => v.tema_id === t.id)) as unknown as Video[],
  }));
}
