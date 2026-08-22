// src/lib/data/worksheet.ts — hak & kuota unduh worksheet, plus pencatatan unduhannya.
//
// Tombol worksheet TIDAK boleh berupa tautan langsung ke berkasnya: tanpa server action,
// "kuota" hanya hiasan karena tautannya bisa diklik berulang (atau disalin). Jadi unduhan
// melewati `mintaWorksheet()` yang memeriksa sisa kuota lalu mencatatnya.
import { createClient } from '@/lib/supabase/server';
import { getHakAkun } from './langganan-anak';
import {
  awalPeriode, sisaWorksheetAkun, TRIAL_WORKSHEET_MAKS,
  type SisaKuota, type ModeWorksheet,
} from '@/lib/domain/kuota-worksheet';
import type { SatuanKuota } from '@/lib/game/tipe';

export interface StatusWorksheet extends SisaKuota {
  satuan: SatuanKuota;
  /** nama paket yang memberi haknya (untuk pesan di UI) */
  paketNama: string | null;
  /** dari mana haknya berasal — menentukan pesan DAN aturan kuotanya */
  mode: ModeWorksheet;
  /** plafon unduhan trial, untuk ditulis di UI tanpa menebak angkanya */
  maksTrial: number;
}

const KOSONG: StatusWorksheet = {
  boleh: false, tanpaBatas: false, sisa: 0, satuan: 'bulan', paketNama: null,
  mode: 'tidak', maksTrial: TRIAL_WORKSHEET_MAKS,
};

/**
 * Sisa kuota unduh worksheet untuk akun yang login.
 * Haknya berasal dari **paket tertinggi** di akun — sama seperti diskon & Komunitas, karena
 * satu berkas worksheet dipakai bersama di rumah dan tombolnya juga muncul di halaman yang
 * tak punya konteks anak.
 */
export async function getStatusWorksheet(): Promise<StatusWorksheet> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return KOSONG;

  const akun = await getHakAkun();
  const p = akun.paketTertinggi;
  if (!p) return KOSONG;
  // Hak dari TRIAL tidak setara hak berbayar. Masa tenggang ikut 'member': seluruh aplikasi
  // memperlakukan tenggang sebagai masih memegang paketnya, dan worksheet tak boleh menjadi
  // satu-satunya fitur yang menjawab lain untuk anak yang sama.
  const mode: ModeWorksheet = akun.status === 'trial' ? 'trial'
    : (akun.status === 'aktif' || akun.status === 'tenggang') ? 'member' : 'tidak';
  if (mode === 'tidak') return { ...KOSONG, paketNama: p.nama };

  const paketW = {
    worksheet: p.worksheet,
    worksheet_kuota_jumlah: (p as { worksheet_kuota_jumlah?: number }).worksheet_kuota_jumlah ?? 0,
    worksheet_kuota_satuan: ((p as { worksheet_kuota_satuan?: SatuanKuota }).worksheet_kuota_satuan ?? 'bulan'),
  };

  // Dua hitungan yang berbeda, dan keduanya perlu:
  //   • PERIODE — kuota bulanan paket member;
  //   • TOTAL   — plafon trial, yang berlaku seumur trial. Kalau plafon trial dihitung
  //     per periode, trial yang menyeberang bulan mendapat jatah dua kali.
  const hitung = async (sejak: string | null): Promise<number | null> => {
    let q = s.from('unduhan_worksheet').select('id', { count: 'exact', head: true }).eq('ortu_id', user.id);
    if (sejak) q = q.gte('waktu', sejak);
    const { count, error } = await q;
    return error ? null : (count ?? 0);
  };

  let terpakaiPeriode = 0;
  let terpakaiTotal = 0;
  if (mode === 'trial') {
    // Tabel belum ada (0091 belum jalan) → anggap plafonnya SUDAH TERPAKAI. Ini satu-satunya
    // tempat cadangannya menutup, bukan membuka: kalau unduhan tak bisa dicatat, "satu kali"
    // tak bisa ditegakkan sama sekali — dan jatah gratis yang tak terbatas lebih merugikan
    // daripada tombol yang mati.
    const n = await hitung(null);
    terpakaiTotal = n ?? TRIAL_WORKSHEET_MAKS;
  } else if (paketW.worksheet && paketW.worksheet_kuota_jumlah > 0) {
    const n = await hitung(awalPeriode(paketW.worksheet_kuota_satuan, new Date()));
    terpakaiPeriode = n ?? 0;   // member: tabel belum ada → jangan mematikan tombolnya
  }

  return {
    ...sisaWorksheetAkun({ mode, paket: paketW, terpakaiPeriode, terpakaiTotal }),
    satuan: paketW.worksheet_kuota_satuan,
    paketNama: p.nama,
    maksTrial: TRIAL_WORKSHEET_MAKS,
  };
}
