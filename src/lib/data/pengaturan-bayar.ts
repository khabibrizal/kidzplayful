// src/lib/data/pengaturan-bayar.ts — baca master konfigurasi pembayaran (harga langganan + rekening + WA)
import { createClient } from '@/lib/supabase/server';

export interface PengaturanBayar {
  harga_langganan_nominal: number;
  harga_langganan_teks: string;
  bank_teks: string;
  qris_url: string;
  wa_nomor: string;   // WA admin umum (langganan) + fallback
  wa_event: string;   // WA admin khusus Event (kosong = pakai wa_nomor)
  wa_store: string;   // WA admin khusus Store (kosong = pakai wa_nomor)
}

// nilai default (dipakai bila tabel/baris belum ada, mis. migrasi belum dijalankan)
export const DEFAULT_BAYAR: PengaturanBayar = {
  harga_langganan_nominal: 35000,
  harga_langganan_teks: 'Rp 35.000 / bulan',
  bank_teks: 'BCA 1234567890 a.n. KidzPlayful',
  qris_url: '',
  wa_nomor: '6281234567890',
  wa_event: '',
  wa_store: '',
};

/** Ambil konfigurasi pembayaran; selalu mengembalikan objek (fallback ke default bila kosong/gagal). */
export async function getPengaturanBayar(): Promise<PengaturanBayar> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('pengaturan_pembayaran')
      .select('harga_langganan_nominal,harga_langganan_teks,bank_teks,qris_url,wa_nomor,wa_event,wa_store')
      .eq('id', 1)
      .single();
    if (!data) return DEFAULT_BAYAR;
    return {
      harga_langganan_nominal: data.harga_langganan_nominal ?? DEFAULT_BAYAR.harga_langganan_nominal,
      harga_langganan_teks: data.harga_langganan_teks ?? DEFAULT_BAYAR.harga_langganan_teks,
      bank_teks: data.bank_teks ?? DEFAULT_BAYAR.bank_teks,
      qris_url: data.qris_url ?? DEFAULT_BAYAR.qris_url,
      wa_nomor: data.wa_nomor ?? DEFAULT_BAYAR.wa_nomor,
      wa_event: data.wa_event ?? '',
      wa_store: data.wa_store ?? '',
    };
  } catch {
    return DEFAULT_BAYAR;
  }
}

/** WA admin sesuai jenis transaksi (fallback ke wa_nomor umum). */
export function waUntuk(cfg: PengaturanBayar, jenis: 'event' | 'store' | 'langganan'): string {
  if (jenis === 'event') return cfg.wa_event || cfg.wa_nomor;
  if (jenis === 'store') return cfg.wa_store || cfg.wa_nomor;
  return cfg.wa_nomor;
}
