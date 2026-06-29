// src/lib/data/admin-store-actions.ts — CRUD produk + kelola pesanan (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Produk, StatusPesanan } from '@/lib/game/tipe';

export interface ProdukInput {
  nama: string; deskripsi: string; kategori: string;
  harga: number; stok: number; gambarUrl: string | null; status: 'tampil' | 'arsip';
}
const PCOLS = 'id,nama,deskripsi,kategori,harga,stok,gambar_url,status';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}
function row(i: ProdukInput) {
  return {
    nama: i.nama.trim() || 'Tanpa nama',
    deskripsi: i.deskripsi.trim() || null,
    kategori: i.kategori.trim() || null,
    harga: Math.max(0, Math.floor(Number(i.harga) || 0)),
    stok: Math.max(0, Math.floor(Number(i.stok) || 0)),
    gambar_url: i.gambarUrl?.trim() || null,
    status: i.status,
  };
}

export async function buatProduk(i: ProdukInput): Promise<Produk> {
  const s = await adminDb();
  if (!i.nama.trim()) throw new Error('Nama produk wajib diisi.');
  const { data, error } = await s.from('produk').insert(row(i)).select(PCOLS).single();
  if (error) throw new Error(error.message);
  revalidatePath('/store');
  return data as unknown as Produk;
}
export async function updateProduk(id: string, i: ProdukInput): Promise<Produk> {
  const s = await adminDb();
  const { data, error } = await s.from('produk').update(row(i)).eq('id', id).select(PCOLS).single();
  if (error) throw new Error(error.message);
  revalidatePath('/store');
  return data as unknown as Produk;
}
export async function hapusProduk(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('produk').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/store');
}

// ===== Pesanan =====
export async function setOngkir(pesananId: string, ongkir: number): Promise<void> {
  const s = await adminDb();
  const ong = Math.max(0, Math.floor(Number(ongkir) || 0));
  const { data: p } = await s.from('pesanan').select('subtotal').eq('id', pesananId).single();
  if (!p) throw new Error('Pesanan tidak ditemukan.');
  const { error } = await s.from('pesanan')
    .update({ ongkir: ong, total: (p.subtotal ?? 0) + ong, status: 'menunggu_bayar', updated_at: new Date().toISOString() })
    .eq('id', pesananId);
  if (error) throw new Error(error.message);
}

/** Verifikasi pembayaran → diproses + kurangi stok tiap produk. */
export async function verifikasiPesanan(pesananId: string): Promise<void> {
  const s = await adminDb();
  const { data: items } = await s.from('item_pesanan').select('produk_id,qty').eq('pesanan_id', pesananId);
  for (const it of items ?? []) {
    if (!it.produk_id) continue;
    const { data: pr } = await s.from('produk').select('stok').eq('id', it.produk_id).single();
    if (pr) await s.from('produk').update({ stok: Math.max(0, (pr.stok ?? 0) - (it.qty ?? 0)) }).eq('id', it.produk_id);
  }
  const { error } = await s.from('pesanan').update({ status: 'diproses', updated_at: new Date().toISOString() }).eq('id', pesananId);
  if (error) throw new Error(error.message);
}

export async function setResi(pesananId: string, noResi: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('pesanan')
    .update({ no_resi: noResi.trim() || null, status: 'dikirim', updated_at: new Date().toISOString() })
    .eq('id', pesananId);
  if (error) throw new Error(error.message);
}

export async function ubahStatusPesanan(pesananId: string, status: StatusPesanan): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('pesanan').update({ status, updated_at: new Date().toISOString() }).eq('id', pesananId);
  if (error) throw new Error(error.message);
}
