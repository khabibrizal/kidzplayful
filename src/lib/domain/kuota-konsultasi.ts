// src/lib/domain/kuota-konsultasi.ts — sisa kuota konsultasi GRATIS milik seorang anak.
//
// ⚠️ ARTI ANGKA 0 BERBEDA dari kuota worksheet, dan ini mudah tertukar:
//     worksheet   : kuota 0 = TANPA BATAS   (lihat `kuota-worksheet.ts`)
//     konsultasi  : kuota 0 = TIDAK ADA kuota gratis
// Yang mengikat adalah RPC `daftar_konsultasi`: `if v_kuota > 0 then … if v_terpakai <
// v_kuota then dari_kuota := true`. Jadi paket tanpa angka kuota berarti sesinya berbayar,
// bukan gratis tanpa batas. Berkas ini menirunya untuk keperluan tampilan.
import type { SatuanKuota } from '@/lib/game/tipe';

export interface PaketKonsultasi {
  konsultasi_gratis_jumlah: number;
  konsultasi_gratis_satuan: SatuanKuota;
}

export interface SisaKonsultasi {
  /** paket ini memang memberi kuota gratis */
  punyaKuota: boolean;
  jumlah: number;
  terpakai: number;
  sisa: number;
  satuan: SatuanKuota;
}

export const KOSONG_KONSULTASI: SisaKonsultasi = {
  punyaKuota: false, jumlah: 0, terpakai: 0, sisa: 0, satuan: 'bulan',
};

/**
 * @param paket   paket anak itu; null = tak berlangganan
 * @param terpakai jumlah sesi `dari_kuota` pada periode berjalan
 * @param member  langganan anak itu masih berjalan (aturan sama dengan RPC)
 */
export function sisaKuotaKonsultasi(
  paket: PaketKonsultasi | null, terpakai: number, member: boolean,
): SisaKonsultasi {
  if (!paket || !member) return KOSONG_KONSULTASI;
  const jumlah = Math.max(0, Math.floor(paket.konsultasi_gratis_jumlah || 0));
  const dipakai = Math.max(0, Math.floor(terpakai || 0));
  return {
    punyaKuota: jumlah > 0,
    jumlah,
    terpakai: dipakai,
    sisa: Math.max(0, jumlah - dipakai),
    satuan: paket.konsultasi_gratis_satuan ?? 'bulan',
  };
}

/** Keterangan singkat untuk kartu anak. */
export function labelKuotaKonsultasi(k: SisaKonsultasi): string {
  if (!k.punyaKuota) return 'tanpa kuota gratis — sesi berbayar';
  const per = k.satuan === 'bulan' ? 'bulan ini' : 'selama langganan';
  return k.sisa > 0 ? `${k.sisa} dari ${k.jumlah} sesi gratis ${per}` : `kuota gratis habis ${per}`;
}
