// src/lib/data/admin-store.ts — baca produk & pesanan untuk admin
import { createClient } from '@/lib/supabase/server';
import type { Produk, Pesanan } from '@/lib/game/tipe';

const PCOLS = 'id,nama,deskripsi,kategori,harga,stok,gambar_url,status';
const OCOLS = 'id,ortu_id,status,subtotal,ongkir,total,penerima,no_hp,alamat,bukti_url,no_resi,catatan,created_at';

export async function getProdukSemua(): Promise<Produk[]> {
  const s = await createClient();
  const { data } = await s.from('produk').select(PCOLS).order('created_at', { ascending: false });
  return (data ?? []) as unknown as Produk[];
}

export async function getPesananSemua(): Promise<Pesanan[]> {
  const s = await createClient();
  const { data } = await s.from('pesanan').select(`${OCOLS}, item:item_pesanan(id,produk_id,nama,harga,qty)`).order('created_at', { ascending: false });
  return (data ?? []) as unknown as Pesanan[];
}
