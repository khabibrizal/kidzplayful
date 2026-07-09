// src/lib/data/admin-store.ts — baca produk & pesanan untuk admin
import { createClient } from '@/lib/supabase/server';
import type { Produk, Pesanan } from '@/lib/game/tipe';

const PCOLS = 'id,nama,deskripsi,kategori,harga,diskon_trial_persen,diskon_langganan_persen,berat_gram,stok,gambar_url,status';
const OCOLS = 'id,ortu_id,status,subtotal,ongkir,total,penerima,no_hp,alamat,bukti_url,no_resi,catatan,created_at';

export async function getProdukSemua(): Promise<Produk[]> {
  const s = await createClient();
  const { data } = await s.from('produk').select(PCOLS).order('created_at', { ascending: false });
  return (data ?? []) as unknown as Produk[];
}

export const PESANAN_PER_HAL = 20;

export async function getPesananSemua(hal = 1): Promise<{ rows: Pesanan[]; total: number; perHal: number }> {
  const s = await createClient();
  const from = (Math.max(1, hal) - 1) * PESANAN_PER_HAL;
  const { data, count } = await s
    .from('pesanan')
    .select(`${OCOLS}, item:item_pesanan(id,produk_id,nama,harga,qty)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PESANAN_PER_HAL - 1);
  return { rows: (data ?? []) as unknown as Pesanan[], total: count ?? 0, perHal: PESANAN_PER_HAL };
}
