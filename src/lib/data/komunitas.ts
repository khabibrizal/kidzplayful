// src/lib/data/komunitas.ts
import { createClient } from '@/lib/supabase/server';

export interface PostFeed {
  id: string; nama: string; teks: string; created_at: string;
  tema: { nama: string; sampul: string | null } | null;
  jmlSuka: number; jmlKomentar: number; sukaSaya: boolean; milikSaya: boolean;
}

export async function getFeed(): Promise<PostFeed[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: posts } = await supabase
    .from('postingan')
    .select('id,nama,teks,created_at,ortu_id,tema:tema_id(nama,sampul),suka(count),komentar(count)')
    .eq('status', 'tampil').order('created_at', { ascending: false }).limit(100);
  const { data: sukaSaya } = user
    ? await supabase.from('suka').select('postingan_id').eq('ortu_id', user.id)
    : { data: [] };
  const setSuka = new Set((sukaSaya ?? []).map((s) => s.postingan_id));
  return (posts ?? []).map((p) => {
    const tema = Array.isArray(p.tema) ? p.tema[0] : p.tema;
    return {
      id: p.id as string, nama: p.nama as string, teks: p.teks as string, created_at: p.created_at as string,
      tema: tema ? { nama: tema.nama as string, sampul: tema.sampul as string | null } : null,
      jmlSuka: (p.suka as { count: number }[])?.[0]?.count ?? 0,
      jmlKomentar: (p.komentar as { count: number }[])?.[0]?.count ?? 0,
      sukaSaya: setSuka.has(p.id as string),
      milikSaya: user ? p.ortu_id === user.id : false,
    };
  });
}

export interface KomentarItem { id: string; nama: string; teks: string; created_at: string; }
export interface PostDetail { id: string; nama: string; teks: string; created_at: string; komentar: KomentarItem[]; }

export async function getPostingan(id: string): Promise<PostDetail | null> {
  const supabase = await createClient();
  const { data: p } = await supabase.from('postingan').select('id,nama,teks,created_at').eq('id', id).eq('status', 'tampil').maybeSingle();
  if (!p) return null;
  const { data: k } = await supabase.from('komentar').select('id,nama,teks,created_at').eq('postingan_id', id).eq('status', 'tampil').order('created_at');
  return { id: p.id, nama: p.nama, teks: p.teks, created_at: p.created_at, komentar: (k ?? []) as KomentarItem[] };
}
