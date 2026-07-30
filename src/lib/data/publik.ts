// src/lib/data/publik.ts — katalog publik dengan cache lintas-user (unstable_cache).
// Pakai client anon (tanpa cookie) supaya bisa di-cache. Invalidasi via revalidateTag('katalog').
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import type { EventKelas, Produk, KelasBermain } from '@/lib/game/tipe';

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

const E = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,diskon_langganan_persen,status,kuota_baby,kuota_toddler,kuota_gabungan';
const P = 'id,nama,deskripsi,kategori,harga,diskon_trial_persen,diskon_langganan_persen,berat_gram,stok,terjual,gambar_url,status';
const K = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';

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

// —— Teaser publik (halaman /coba/*): metadata ringan, tanpa butir/materi penuh ——
export async function getKelasPublik(id: string): Promise<{ id: string; judul: string; tujuan: string | null; usia_min: number; usia_max: number; sampul_url: string | null } | null> {
  const { data } = await anon.from('kelas_bermain')
    .select('id,judul,tujuan,usia_min,usia_max,sampul_url')
    .eq('id', id).eq('status', 'aktif').maybeSingle();
  return (data ?? null) as { id: string; judul: string; tujuan: string | null; usia_min: number; usia_max: number; sampul_url: string | null } | null;
}

export async function getTemaPublik(id: string): Promise<{ id: string; nama: string; sampul: string | null; game: string[] } | null> {
  const [{ data: tema }, { data: paket }] = await Promise.all([
    anon.from('tema').select('id,nama,sampul').eq('id', id).eq('status', 'disetujui').maybeSingle(),
    anon.from('paket_aset').select('judul').eq('tema_id', id).eq('status', 'disetujui').order('urutan'),
  ]);
  if (!tema) return null;
  return { id: tema.id as string, nama: tema.nama as string, sampul: (tema.sampul as string) ?? null, game: (paket ?? []).map((p) => p.judul as string) };
}
