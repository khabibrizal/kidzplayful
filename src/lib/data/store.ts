// src/lib/data/store.ts — baca produk (sisi user)
import { createClient } from '@/lib/supabase/server';
import type { Produk } from '@/lib/game/tipe';

const COLS = 'id,nama,deskripsi,kategori,harga,diskon_trial_persen,diskon_langganan_persen,berat_gram,stok,gambar_url,status';

export async function getProdukTampil(): Promise<Produk[]> {
  const s = await createClient();
  const { data } = await s.from('produk').select(COLS).eq('status', 'tampil').order('created_at', { ascending: false });
  return (data ?? []) as unknown as Produk[];
}

export async function getProduk(id: string): Promise<Produk | null> {
  const s = await createClient();
  const { data } = await s.from('produk').select(COLS).eq('id', id).maybeSingle();
  return (data as unknown as Produk) ?? null;
}
