// src/lib/data/publik.ts — katalog publik dengan cache lintas-user (unstable_cache).
// Pakai client anon (tanpa cookie) supaya bisa di-cache. Invalidasi via revalidateTag('katalog').
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import type { EventKelas, Produk, KelasBermain } from '@/lib/game/tipe';

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

const E = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,diskon_langganan_persen,status';
const P = 'id,nama,deskripsi,kategori,harga,diskon_trial_persen,diskon_langganan_persen,berat_gram,stok,gambar_url,status';
const K = 'id,judul,aktivitas,bahan,link_ide,worksheet_url,status';

export const getEventTampilCached = unstable_cache(
  async (): Promise<EventKelas[]> => {
    const { data } = await anon.from('event').select(E).eq('status', 'tampil').order('tanggal', { ascending: true });
    return (data ?? []) as unknown as EventKelas[];
  },
  ['katalog-event'], { tags: ['katalog'], revalidate: 60 },
);

export const getProdukTampilCached = unstable_cache(
  async (): Promise<Produk[]> => {
    const { data } = await anon.from('produk').select(P).eq('status', 'tampil').order('created_at', { ascending: false });
    return (data ?? []) as unknown as Produk[];
  },
  ['katalog-produk'], { tags: ['katalog'], revalidate: 60 },
);

export const getKelasAktifCached = unstable_cache(
  async (): Promise<KelasBermain[]> => {
    const { data } = await anon.from('kelas_bermain').select(K).eq('status', 'aktif').order('created_at', { ascending: false });
    return (data ?? []) as unknown as KelasBermain[];
  },
  ['katalog-kelas'], { tags: ['katalog'], revalidate: 60 },
);
