// src/lib/domain/laporan.ts
import { statusLangganan, type OpsiTrial } from './trial';

export interface BarisLangganan {
  trial_mulai: string;
  aktif_sampai: string | null;
  nominal: number;
}

export interface Ringkasan {
  total: number; aktif: number; trial: number; tenggang: number; kadaluarsa: number; mrr: number;
}

/**
 * Ringkasan status langganan untuk laporan admin/investor.
 *
 * `opsi` meneruskan lama trial & tenggang yang diatur pemilik (`pengaturan_trial.trial_hari`,
 * migrasi 0089). Tanpa itu, laporan akan memakai lama trial bawaan dan bisa berbeda dari yang
 * dilihat orang tua di aplikasi.
 */
export function ringkasanLangganan(rows: BarisLangganan[], sekarang: Date, opsi: OpsiTrial = {}): Ringkasan {
  const r: Ringkasan = { total: rows.length, aktif: 0, trial: 0, tenggang: 0, kadaluarsa: 0, mrr: 0 };
  for (const row of rows) {
    const st = statusLangganan(
      {
        trialMulai: new Date(row.trial_mulai + 'T00:00:00Z'),
        aktifSampai: row.aktif_sampai ? new Date(row.aktif_sampai + 'T00:00:00Z') : null,
      },
      sekarang,
      opsi,
    );
    r[st] += 1;
    if (st === 'aktif') r.mrr += row.nominal || 0;
  }
  return r;
}
