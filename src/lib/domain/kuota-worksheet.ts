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

/**
 * Batas unduh worksheet selama masa TRIAL: SATU kali, seumur masa trial — bukan satu per
 * bulan. Trial adalah cicipan, dan worksheet adalah berkas yang bisa disimpan selamanya;
 * satu berkas sudah cukup untuk menilai apakah materinya layak dibayar.
 */
export const TRIAL_WORKSHEET_MAKS = 1;

/**
 * Dari mana hak unduh worksheet sebuah akun berasal.
 *   'member' — langganan berbayar yang masih berjalan (termasuk masa tenggang, karena
 *               seluruh aplikasi memperlakukan tenggang sebagai masih memegang paketnya);
 *   'trial'  — masa percobaan: paling banyak `TRIAL_WORKSHEET_MAKS` unduhan, SELAMANYA;
 *   'tidak'  — bukan pelanggan: tak boleh mengunduh sama sekali.
 */
export type ModeWorksheet = 'member' | 'trial' | 'tidak';

export interface SisaWorksheetAkun extends SisaKuota { mode: ModeWorksheet }

/**
 * Hak & sisa unduh worksheet sebuah AKUN.
 *
 * Aturannya berlapis, dan urutannya penting:
 *   1. bukan pelanggan → TIDAK BOLEH sama sekali (sebelumnya masih bisa, lewat paket trial
 *      dan lewat materi bertanda `worksheet_terbuka`);
 *   2. trial → dibatasi `TRIAL_WORKSHEET_MAKS` unduhan **seumur trial**, dihitung dari
 *      SELURUH riwayat unduhan akun itu, bukan dari periode berjalan — kalau dihitung per
 *      bulan, trial yang menyeberang bulan mendapat jatah dua kali;
 *   3. member → kuota paketnya seperti biasa.
 *
 * Batas trial adalah PLAFON, bukan pemberian: bila paket trial memang tak memberi hak
 * worksheet (`worksheet = false`), hasilnya tetap nol. Aturan ini hanya boleh MENGURANGI
 * akses dibanding paketnya, tak pernah menambah — kalau tidak, ia diam-diam menghidupkan
 * fitur yang sengaja dimatikan admin.
 */
export function sisaWorksheetAkun(args: {
  mode: ModeWorksheet;
  paket: PaketWorksheet | null;
  /** unduhan pada periode kuota paket (untuk member) */
  terpakaiPeriode: number;
  /** SELURUH unduhan akun ini sepanjang masa (untuk plafon trial) */
  terpakaiTotal: number;
}): SisaWorksheetAkun {
  const { mode, paket, terpakaiPeriode, terpakaiTotal } = args;
  if (mode === 'tidak' || !paket || !paket.worksheet) {
    return { mode: mode === 'member' ? 'member' : mode, boleh: false, tanpaBatas: false, sisa: 0 };
  }
  if (mode === 'trial') {
    const sisa = Math.max(0, TRIAL_WORKSHEET_MAKS - Math.max(0, Math.floor(terpakaiTotal)));
    return { mode: 'trial', boleh: sisa > 0, tanpaBatas: false, sisa };
  }
  return { mode: 'member', ...sisaKuotaWorksheet(paket, terpakaiPeriode) };
}
