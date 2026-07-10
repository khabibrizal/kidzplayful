// src/lib/data/admin-store-actions.ts — CRUD produk + kelola pesanan (admin)
'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Produk, StatusPesanan } from '@/lib/game/tipe';
import { catatLedger, hapusLedgerRef } from './ledger';

type DB = Awaited<ReturnType<typeof createClient>>;

// Agregasi qty per produk dari item pesanan.
async function qtyPerProduk(s: DB, pesananId: string): Promise<Map<string, number>> {
  const { data: items } = await s.from('item_pesanan').select('produk_id,qty').eq('pesanan_id', pesananId);
  const m = new Map<string, number>();
  for (const it of items ?? []) {
    if (!it.produk_id) continue;
    m.set(it.produk_id, (m.get(it.produk_id) ?? 0) + (it.qty ?? 0));
  }
  return m;
}

/** Potong stok + tambah `terjual`, IDEMPOTEN (flag pesanan.stok_terpotong). Aman dipanggil berulang. */
async function potongStokPesanan(s: DB, pesananId: string): Promise<void> {
  const { data: pes } = await s.from('pesanan').select('stok_terpotong').eq('id', pesananId).single();
  if (pes?.stok_terpotong) return; // sudah dipotong → jangan dobel
  const qty = await qtyPerProduk(s, pesananId);
  const ids = [...qty.keys()];
  if (ids.length) {
    const { data: produk } = await s.from('produk').select('id,stok,terjual').in('id', ids);
    const hasil = await Promise.all((produk ?? []).map((pr) => {
      const q = qty.get(pr.id) ?? 0;
      return s.from('produk').update({ stok: Math.max(0, (pr.stok ?? 0) - q), terjual: (pr.terjual ?? 0) + q }).eq('id', pr.id);
    }));
    const gagal = hasil.find((r) => r.error);
    if (gagal?.error) throw new Error('Gagal memperbarui stok: ' + gagal.error.message);
  }
  await s.from('pesanan').update({ stok_terpotong: true }).eq('id', pesananId);
  updateTag('katalog'); // segarkan katalog store (stok & terjual terbaru)
  revalidatePath('/store');
}

/** Kebalikan potong: kembalikan stok & kurangi `terjual` bila pesanan dibatalkan setelah dipotong. */
async function pulihkanStokPesanan(s: DB, pesananId: string): Promise<void> {
  const { data: pes } = await s.from('pesanan').select('stok_terpotong').eq('id', pesananId).single();
  if (!pes?.stok_terpotong) return;
  const qty = await qtyPerProduk(s, pesananId);
  const ids = [...qty.keys()];
  if (ids.length) {
    const { data: produk } = await s.from('produk').select('id,stok,terjual').in('id', ids);
    await Promise.all((produk ?? []).map((pr) => {
      const q = qty.get(pr.id) ?? 0;
      return s.from('produk').update({ stok: (pr.stok ?? 0) + q, terjual: Math.max(0, (pr.terjual ?? 0) - q) }).eq('id', pr.id);
    }));
  }
  await s.from('pesanan').update({ stok_terpotong: false }).eq('id', pesananId);
  updateTag('katalog');
  revalidatePath('/store');
}

export interface ProdukInput {
  nama: string; deskripsi: string; kategori: string;
  harga: number; diskonTrialPersen: number; diskonLanggananPersen: number; beratGram: number;
  stok: number; gambarUrl: string | null; status: 'tampil' | 'arsip';
}
const persen = (v: number) => { const n = Math.min(100, Math.max(0, Math.floor(Number(v) || 0))); return n > 0 ? n : null; };
const PCOLS = 'id,nama,deskripsi,kategori,harga,diskon_trial_persen,diskon_langganan_persen,berat_gram,stok,terjual,gambar_url,status';

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
    diskon_trial_persen: persen(i.diskonTrialPersen),
    diskon_langganan_persen: persen(i.diskonLanggananPersen),
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

/** Verifikasi pembayaran → diproses + kurangi stok & tambah terjual (idempoten). */
export async function verifikasiPesanan(pesananId: string): Promise<void> {
  const s = await adminDb();
  await potongStokPesanan(s, pesananId); // idempoten: stok-- & terjual++ (cek error di dalam)
  const { data: pes } = await s.from('pesanan').select('subtotal').eq('id', pesananId).single();
  const { error } = await s.from('pesanan').update({ status: 'diproses', diverifikasi_pada: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', pesananId);
  if (error) throw new Error(error.message);
  // catat pemasukan (basis kas): revenue store = subtotal (ongkir bukan pendapatan)
  await catatLedger(s, { arah: 'masuk', kategori: 'store', jumlah: pes?.subtotal ?? 0, ref_tipe: 'pesanan', ref_id: pesananId, keterangan: `Pesanan #${pesananId.slice(0, 8)}`, metode: 'transfer' });
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
  if (status === 'batal') {
    await hapusLedgerRef(s, 'pesanan', pesananId); // batalkan pemasukan bila sudah tercatat
    await pulihkanStokPesanan(s, pesananId);       // kembalikan stok bila sudah terpotong
  }
}
