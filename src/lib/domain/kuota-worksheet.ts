// src/lib/domain/kuota-worksheet.ts — kuota unduh worksheet (murni, teruji).
//
// Arti nilainya sengaja ditulis di satu tempat karena mudah tertukar:
//   worksheet = false            → tidak bisa mengunduh sama sekali
//   worksheet = true,  kuota = 0 → TANPA BATAS
//   worksheet = true,  kuota > 0 → maksimal N unduhan per satuan
import type { SatuanKuota } from '@/lib/game/tipe';

export interface PaketWorksheet {
  worksheet: boolean;
  worksheet_kuota_jumlah: number;
  worksheet_kuota_satuan: SatuanKuota;
}

export interface SisaKuota {
  boleh: boolean;
  tanpaBatas: boolean;
  /** null = tanpa batas */
  sisa: number | null;
}

const MENIT = 60 * 1000;
const OFFSET_WIB = 7 * 60 * MENIT;

/**
 * Awal periode perhitungan sebagai ISO string, atau null bila dihitung sejak awal.
 *
 * Satuan `bulan` memakai awal bulan **WIB**, bukan UTC: kuota yang reset pada jam 7 pagi
 * tanggal 1 akan terasa seperti salah hitung bagi pengguna di Indonesia.
 */
export function awalPeriode(satuan: SatuanKuota, sekarang: Date): string | null {
  if (satuan === 'langganan') return null;
  const wib = new Date(sekarang.getTime() + OFFSET_WIB);
  const awalWib = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1, 0, 0, 0, 0);
  return new Date(awalWib - OFFSET_WIB).toISOString();
}

export function sisaKuotaWorksheet(paket: PaketWorksheet | null, terpakai: number): SisaKuota {
  if (!paket || !paket.worksheet) return { boleh: false, tanpaBatas: false, sisa: 0 };
  const kuota = Math.max(0, Math.floor(Number(paket.worksheet_kuota_jumlah) || 0));
  if (kuota === 0) return { boleh: true, tanpaBatas: true, sisa: null };
  const sisa = Math.max(0, kuota - Math.max(0, Math.floor(terpakai)));
  return { boleh: sisa > 0, tanpaBatas: false, sisa };
}
