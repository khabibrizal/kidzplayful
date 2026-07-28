// src/lib/data/voucher.ts — reader master voucher + helper nilai/redeem (dipakai server actions).
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { hitungPotongan, validasiVoucher } from '@/lib/domain/voucher';

export interface Voucher {
  id: string; kode: string; tipe: 'nominal' | 'persen'; nilai: number;
  berlaku_event: boolean; berlaku_produk: boolean;
  kuota_total: number | null; kuota_per_user: number | null;
  berlaku_dari: string | null; berlaku_sampai: string | null; aktif: boolean; created_at: string;
}
const COLS = 'id,kode,tipe,nilai,berlaku_event,berlaku_produk,kuota_total,kuota_per_user,berlaku_dari,berlaku_sampai,aktif,created_at';

export async function getVoucherSemua(): Promise<Voucher[]> {
  const s = await createClient();
  const { data } = await s.from('voucher').select(COLS).order('created_at', { ascending: false });
  return (data ?? []) as unknown as Voucher[];
}

export interface HasilNilai { ok: boolean; voucher_id?: string; kode?: string; potongan?: number; error?: string }

// Hitung potongan + validasi lengkap (termasuk kuota) untuk sebuah baris voucher.
async function nilai(s: SupabaseClient, v: Voucher | null, jenis: 'event' | 'produk', subtotal: number, userId: string): Promise<HasilNilai> {
  if (!v) return { ok: false, error: 'Kode voucher tidak valid.' };
  const err = validasiVoucher(v, { jenis, hariIni: new Date().toISOString().slice(0, 10) });
  if (err) return { ok: false, error: err };
  if (v.kuota_total != null) {
    const { count } = await s.from('voucher_redeem').select('id', { count: 'exact', head: true }).eq('voucher_id', v.id);
    if ((count ?? 0) >= v.kuota_total) return { ok: false, error: 'Kuota voucher habis.' };
  }
  if (v.kuota_per_user != null) {
    const { count } = await s.from('voucher_redeem').select('id', { count: 'exact', head: true }).eq('voucher_id', v.id).eq('ortu_id', userId);
    if ((count ?? 0) >= v.kuota_per_user) return { ok: false, error: 'Kamu sudah memakai voucher ini.' };
  }
  return { ok: true, voucher_id: v.id, kode: v.kode, potongan: hitungPotongan(v, subtotal) };
}

export async function nilaiVoucherByKode(s: SupabaseClient, kode: string, jenis: 'event' | 'produk', subtotal: number, userId: string): Promise<HasilNilai> {
  const k = (kode ?? '').trim().toUpperCase();
  if (!k) return { ok: false, error: 'Masukkan kode voucher.' };
  const { data } = await s.from('voucher').select(COLS).eq('kode', k).maybeSingle();
  return nilai(s, (data ?? null) as Voucher | null, jenis, subtotal, userId);
}

export async function nilaiVoucherById(s: SupabaseClient, voucherId: string, jenis: 'event' | 'produk', subtotal: number, userId: string): Promise<HasilNilai> {
  const { data } = await s.from('voucher').select(COLS).eq('id', voucherId).maybeSingle();
  return nilai(s, (data ?? null) as Voucher | null, jenis, subtotal, userId);
}
