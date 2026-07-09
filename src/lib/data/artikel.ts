// src/lib/data/artikel.ts — baca artikel publik (blog)
import { createClient } from '@/lib/supabase/server';
import { createClient as createAnon } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

// Client anon (tanpa cookie) agar hasilnya bisa di-cache lintas-user (unstable_cache).
// Invalidasi via revalidateTag('artikel') saat artikel dibuat/diedit/dihapus.
const anon = createAnon(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

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

/** Daftar artikel yang sudah terbit (untuk /artikel & sitemap). Opsional cari (q) & batas (limit). */
export async function getArtikelTerbit(opts?: { q?: string; limit?: number }): Promise<ArtikelRingkas[]> {
  const s = await createClient();
  let query = s
    .from('artikel')
    .select('slug,judul,ringkasan,sampul_url,terbit_pada')
    .eq('status', 'terbit')
    .order('terbit_pada', { ascending: false });

  const q = opts?.q?.trim();
  if (q) {
    // bersihkan karakter yang mengganggu sintaks filter PostgREST
    const aman = q.replace(/[,()%*]/g, ' ').trim();
    if (aman) query = query.or(`judul.ilike.%${aman}%,ringkasan.ilike.%${aman}%`);
  }
  if (opts?.limit) query = query.limit(opts.limit);

  const { data } = await query;
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

/** Daftar artikel terbit (TANPA pencarian) — versi ter-cache untuk halaman publik & sitemap. */
export const getArtikelTerbitCached = unstable_cache(
  async (): Promise<ArtikelRingkas[]> => {
    const { data } = await anon
      .from('artikel')
      .select('slug,judul,ringkasan,sampul_url,terbit_pada')
      .eq('status', 'terbit')
      .order('terbit_pada', { ascending: false });
    return (data ?? []) as ArtikelRingkas[];
  },
  ['artikel-terbit'], { tags: ['artikel'], revalidate: 300 },
);

/** Satu artikel terbit by slug — versi ter-cache (per slug). */
export function getArtikelBySlugCached(slug: string): Promise<Artikel | null> {
  return unstable_cache(
    async (): Promise<Artikel | null> => {
      const { data } = await anon.from('artikel').select('*').eq('slug', slug).eq('status', 'terbit').maybeSingle();
      return (data as Artikel | null) ?? null;
    },
    ['artikel-slug', slug], { tags: ['artikel'], revalidate: 300 },
  )();
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
