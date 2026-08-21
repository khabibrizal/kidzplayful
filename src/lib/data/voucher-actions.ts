// src/lib/data/voucher-actions.ts — CRUD master voucher (admin) + cekVoucher (redeem).
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { nilaiVoucherByKode, type HasilNilai } from './voucher';
import type { JenisVoucher } from '@/lib/domain/voucher';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}
const segarkan = () => revalidatePath('/admin/voucher');

export interface VoucherInput {
  kode: string; tipe: 'nominal' | 'persen'; nilai: number;
  berlakuEvent: boolean; berlakuProduk: boolean; berlakuLangganan: boolean; berlakuKonsultasi: boolean;
  kuotaTotal: number | null; kuotaPerUser: number | null;
  berlakuDari: string | null; berlakuSampai: string | null; aktif: boolean;
}

function baris(i: VoucherInput) {
  const nilai = i.tipe === 'persen' ? Math.max(0, Math.min(100, Math.floor(i.nilai || 0))) : Math.max(0, Math.floor(i.nilai || 0));
  const posInt = (n: number | null) => (n == null || n === 0 ? null : Math.max(1, Math.floor(n)));
  return {
    kode: i.kode.trim().toUpperCase(), tipe: i.tipe, nilai,
    berlaku_event: !!i.berlakuEvent, berlaku_produk: !!i.berlakuProduk,
    berlaku_langganan: !!i.berlakuLangganan,
    berlaku_konsultasi: !!i.berlakuKonsultasi,
    kuota_total: posInt(i.kuotaTotal), kuota_per_user: posInt(i.kuotaPerUser),
    berlaku_dari: i.berlakuDari || null, berlaku_sampai: i.berlakuSampai || null, aktif: !!i.aktif,
  };
}

function validasiInput(i: VoucherInput): string | null {
  if (!i.kode.trim()) return 'Kode voucher wajib diisi.';
  if (i.tipe !== 'nominal' && i.tipe !== 'persen') return 'Tipe potongan tidak valid.';
  if (!(i.nilai > 0)) return 'Nilai potongan harus > 0.';
  if (!i.berlakuEvent && !i.berlakuProduk) return 'Pilih minimal satu jenis transaksi (Event/Produk).';
  return null;
}

export async function buatVoucher(i: VoucherInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const err = validasiInput(i); if (err) return { ok: false, error: err };
    const { error } = await s.from('voucher').insert(baris(i));
    if (error) return { ok: false, error: error.code === '23505' ? 'Kode voucher sudah dipakai.' : error.message };
    segarkan(); return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}

export async function updateVoucher(id: string, i: VoucherInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const err = validasiInput(i); if (err) return { ok: false, error: err };
    const { error } = await s.from('voucher').update(baris(i)).eq('id', id);
    if (error) return { ok: false, error: error.code === '23505' ? 'Kode voucher sudah dipakai.' : error.message };
    segarkan(); return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}

export async function setAktifVoucher(id: string, aktif: boolean): Promise<{ ok: boolean; error?: string }> {
  try { const s = await adminDb(); const { error } = await s.from('voucher').update({ aktif }).eq('id', id); if (error) return { ok: false, error: error.message }; segarkan(); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}

export async function hapusVoucher(id: string): Promise<{ ok: boolean; error?: string }> {
  try { const s = await adminDb(); const { error } = await s.from('voucher').delete().eq('id', id); if (error) return { ok: false, error: error.message }; segarkan(); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}

/** Cek voucher saat user mengetik kode di form transaksi. */
export async function cekVoucher(kode: string, jenis: JenisVoucher, subtotal: number): Promise<HasilNilai> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { ok: false, error: 'Harus login.' };
  return nilaiVoucherByKode(s, kode, jenis, subtotal, user.id);
}
