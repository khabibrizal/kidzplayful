// src/lib/data/admin-store-actions.ts — CRUD produk + kelola pesanan (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Produk, StatusPesanan } from '@/lib/game/tipe';

export interface ProdukInput {
  nama: string; deskripsi: string; kategori: string;
  harga: number; hargaDiskonTrial: number; hargaDiskonLangganan: number; beratGram: number;
  stok: number; gambarUrl: string | null; status: 'tampil' | 'arsip';
}
const PCOLS = 'id,nama,deskripsi,kategori,harga,harga_diskon_trial,harga_diskon_langganan,berat_gram,stok,gambar_url,status';

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
    harga_diskon_trial: Number(i.hargaDiskonTrial) > 0 ? Math.floor(Number(i.hargaDiskonTrial)) : null,
    harga_diskon_langganan: Number(i.hargaDiskonLangganan) > 0 ? Math.floor(Number(i.hargaDiskonLangganan)) : null,
    berat_gram: Number(i.beratGram) > 0 ? Math.floor(Number(i.beratGram)) : null,
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
  revalidatePath('/pesanan'); // total baru langsung terlihat di halaman pesanan user
}

/** Verifikasi pembayaran → diproses + kurangi stok tiap produk. */
export async function verifikasiPesanan(pesananId: string): Promise<void> {
  const s = await adminDb();
  const { data: items } = await s.from('item_pesanan').select('produk_id,qty').eq('pesanan_id', pesananId);
  // kurangi stok tiap produk — ambil semua stok dalam 1 query (hindari N+1), lalu update paralel
  const qtyPerProduk = new Map<string, number>();
  for (const it of items ?? []) {
    if (!it.produk_id) continue;
    qtyPerProduk.set(it.produk_id, (qtyPerProduk.get(it.produk_id) ?? 0) + (it.qty ?? 0));
  }
  const ids = [...qtyPerProduk.keys()];
  if (ids.length) {
    const { data: produk } = await s.from('produk').select('id,stok').in('id', ids);
    await Promise.all((produk ?? []).map((pr) =>
      s.from('produk').update({ stok: Math.max(0, (pr.stok ?? 0) - (qtyPerProduk.get(pr.id) ?? 0)) }).eq('id', pr.id),
    ));
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
