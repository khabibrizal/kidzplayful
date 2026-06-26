// src/lib/data/video.ts
import { createClient } from '@/lib/supabase/server';
import type { Video } from '@/lib/game/tipe';

export async function getVideoByKategori(kategori: 'baby' | 'toddler'): Promise<Video[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('video')
    .select('id,judul,youtube_id,durasi_detik,kategori')
    .eq('kategori', kategori).eq('status', 'disetujui').eq('link_ok', true)
    .order('urutan');
  return (data ?? []) as unknown as Video[];
}
