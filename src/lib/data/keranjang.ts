// src/lib/data/keranjang.ts — baca keranjang
import { createClient } from '@/lib/supabase/server';
import type { KeranjangItem } from '@/lib/game/tipe';

const PCOLS = 'id,nama,deskripsi,kategori,harga,harga_diskon_trial,harga_diskon_langganan,berat_gram,stok,gambar_url,status';

export async function getKeranjang(): Promise<KeranjangItem[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s
    .from('keranjang_item')
    .select(`produk_id, qty, produk:produk_id(${PCOLS})`)
    .eq('ortu_id', user.id)
    .order('created_at', { ascending: true });
  return (data ?? [])
    .map((r) => ({ produk_id: r.produk_id, qty: r.qty, produk: Array.isArray(r.produk) ? r.produk[0] : r.produk }))
    .filter((r) => r.produk) as unknown as KeranjangItem[];
}

/** Total qty di keranjang (untuk badge). */
export async function getJumlahKeranjang(): Promise<number> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return 0;
  const { data } = await s.from('keranjang_item').select('qty').eq('ortu_id', user.id);
  return (data ?? []).reduce((a, r) => a + (r.qty ?? 0), 0);
}
