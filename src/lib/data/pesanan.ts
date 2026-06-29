// src/lib/data/pesanan.ts — baca pesanan (sisi user)
import { createClient } from '@/lib/supabase/server';
import type { Pesanan } from '@/lib/game/tipe';

const COLS = 'id,ortu_id,status,subtotal,ongkir,total,penerima,no_hp,alamat,bukti_url,no_resi,catatan,created_at';

export async function getPesananSaya(): Promise<Pesanan[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s.from('pesanan').select(COLS).eq('ortu_id', user.id).order('created_at', { ascending: false });
  return (data ?? []) as unknown as Pesanan[];
}

export async function getPesanan(id: string): Promise<Pesanan | null> {
  const s = await createClient();
  const { data } = await s.from('pesanan').select(`${COLS}, item:item_pesanan(id,produk_id,nama,harga,qty)`).eq('id', id).maybeSingle();
  return (data as unknown as Pesanan) ?? null;
}
