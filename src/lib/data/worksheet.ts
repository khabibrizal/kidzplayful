// src/lib/data/worksheet.ts — hak & kuota unduh worksheet, plus pencatatan unduhannya.
//
// Tombol worksheet TIDAK boleh berupa tautan langsung ke berkasnya: tanpa server action,
// "kuota" hanya hiasan karena tautannya bisa diklik berulang (atau disalin). Jadi unduhan
// melewati `mintaWorksheet()` yang memeriksa sisa kuota lalu mencatatnya.
import { createClient } from '@/lib/supabase/server';
import { getHakAkun } from './langganan-anak';
import { awalPeriode, sisaKuotaWorksheet, type SisaKuota } from '@/lib/domain/kuota-worksheet';
import type { SatuanKuota } from '@/lib/game/tipe';

export interface StatusWorksheet extends SisaKuota {
  satuan: SatuanKuota;
  /** nama paket yang memberi haknya (untuk pesan di UI) */
  paketNama: string | null;
}

const KOSONG: StatusWorksheet = { boleh: false, tanpaBatas: false, sisa: 0, satuan: 'bulan', paketNama: null };

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

  const paketW = {
    worksheet: p.worksheet,
    worksheet_kuota_jumlah: (p as { worksheet_kuota_jumlah?: number }).worksheet_kuota_jumlah ?? 0,
    worksheet_kuota_satuan: ((p as { worksheet_kuota_satuan?: SatuanKuota }).worksheet_kuota_satuan ?? 'bulan'),
  };

  let terpakai = 0;
  if (paketW.worksheet && paketW.worksheet_kuota_jumlah > 0) {
    const sejak = awalPeriode(paketW.worksheet_kuota_satuan, new Date());
    let q = s.from('unduhan_worksheet').select('id', { count: 'exact', head: true }).eq('ortu_id', user.id);
    if (sejak) q = q.gte('waktu', sejak);
    const { count, error } = await q;
    // Tabel belum ada (migrasi 0091 belum jalan) → anggap belum ada unduhan, jangan
    // mematikan tombolnya.
    if (!error) terpakai = count ?? 0;
  }

  return {
    ...sisaKuotaWorksheet(paketW, terpakai),
    satuan: paketW.worksheet_kuota_satuan,
    paketNama: p.nama,
  };
}
