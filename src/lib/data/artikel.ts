// src/lib/data/artikel.ts — baca artikel publik (blog)
import { createClient } from '@/lib/supabase/server';

export interface Artikel {
  id: string;
  slug: string;
  judul: string;
  ringkasan: string;
  isi: string;
  sampul_url: string | null;
  status: 'draf' | 'terbit';
  terbit_pada: string | null;
  created_at: string;
  updated_at: string;
}

export type ArtikelRingkas = Pick<Artikel, 'slug' | 'judul' | 'ringkasan' | 'sampul_url' | 'terbit_pada'>;

/** Daftar artikel yang sudah terbit (untuk /artikel & sitemap). */
export async function getArtikelTerbit(): Promise<ArtikelRingkas[]> {
  const s = await createClient();
  const { data } = await s
    .from('artikel')
    .select('slug,judul,ringkasan,sampul_url,terbit_pada')
    .eq('status', 'terbit')
    .order('terbit_pada', { ascending: false });
  return (data ?? []) as ArtikelRingkas[];
}

/** Satu artikel terbit berdasarkan slug (null bila tak ada/masih draf). */
export async function getArtikelBySlug(slug: string): Promise<Artikel | null> {
  const s = await createClient();
  const { data } = await s
    .from('artikel')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'terbit')
    .maybeSingle();
  return (data as Artikel | null) ?? null;
}

/** Semua artikel (admin) — termasuk draf. */
export async function getArtikelSemua(): Promise<Artikel[]> {
  const s = await createClient();
  const { data } = await s.from('artikel').select('*').order('updated_at', { ascending: false });
  return (data ?? []) as Artikel[];
}

/** Satu artikel by id (admin editor). */
export async function getArtikelById(id: string): Promise<Artikel | null> {
  const s = await createClient();
  const { data } = await s.from('artikel').select('*').eq('id', id).maybeSingle();
  return (data as Artikel | null) ?? null;
}
