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
  wa_konsultasi: string; // WA admin khusus Konsultasi (0092; kosong = pakai wa_nomor)
  harga_konsultasi_nominal: number;              // tarif bawaan global konsultasi (0092)
  diskon_konsultasi_langganan_persen: number;    // diskon member bawaan (100 = member gratis)
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
  wa_konsultasi: '',
  harga_konsultasi_nominal: 0,
  diskon_konsultasi_langganan_persen: 100,
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

    // Kolom 0092 dibaca TERPISAH: satu kolom yang belum ada tak boleh menggagalkan
    // pembacaan rekening & QRIS yang sudah dipakai seluruh alur pembayaran.
    let wa_konsultasi = '';
    let harga_konsultasi_nominal = 0;
    let diskon_konsultasi_langganan_persen = 100;
    try {
      const { data: baru } = await supabase
        .from('pengaturan_pembayaran')
        .select('wa_konsultasi,harga_konsultasi_nominal,diskon_konsultasi_langganan_persen')
        .eq('id', 1).single();
      if (baru) {
        wa_konsultasi = (baru.wa_konsultasi as string | null) ?? '';
        harga_konsultasi_nominal = (baru.harga_konsultasi_nominal as number | null) ?? 0;
        diskon_konsultasi_langganan_persen = (baru.diskon_konsultasi_langganan_persen as number | null) ?? 100;
      }
    } catch { /* migrasi 0092 belum dijalankan — pakai bawaan */ }

    return {
      harga_langganan_nominal: data.harga_langganan_nominal ?? DEFAULT_BAYAR.harga_langganan_nominal,
      harga_langganan_teks: data.harga_langganan_teks ?? DEFAULT_BAYAR.harga_langganan_teks,
      bank_teks: data.bank_teks ?? DEFAULT_BAYAR.bank_teks,
      qris_url: data.qris_url ?? DEFAULT_BAYAR.qris_url,
      wa_nomor: data.wa_nomor ?? DEFAULT_BAYAR.wa_nomor,
      wa_event: data.wa_event ?? '',
      wa_store: data.wa_store ?? '',
      wa_konsultasi,
      harga_konsultasi_nominal,
      diskon_konsultasi_langganan_persen,
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
