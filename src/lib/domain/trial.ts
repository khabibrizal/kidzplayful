// src/lib/domain/trial.ts
//
// Lama trial & tenggang adalah PARAMETER, bukan konstanta mati: pemilik mengaturnya di
// /admin/pengaturan-trial (kolom `pengaturan_trial.trial_hari`, migrasi 0089). Nilai di bawah
// hanya CADANGAN — dipakai bila setelannya belum terbaca (mis. migrasinya belum dijalankan).
export const TRIAL_HARI = 30;
export const TENGGANG_HARI = 3;

const HARI = 24 * 60 * 60 * 1000;

export interface OpsiTrial { trialHari?: number; tenggangHari?: number }

export function computeTrialEnd(trialMulai: Date, trialHari: number = TRIAL_HARI): Date {
  return new Date(trialMulai.getTime() + trialHari * HARI);
}

export type StatusLangganan = 'aktif' | 'trial' | 'tenggang' | 'kadaluarsa';

export function statusLangganan(
  l: { trialMulai: Date; aktifSampai: Date | null },
  sekarang: Date,
  opsi: OpsiTrial = {},
): StatusLangganan {
  if (l.aktifSampai && sekarang <= l.aktifSampai) return 'aktif';
  const akhirTrial = computeTrialEnd(l.trialMulai, opsi.trialHari ?? TRIAL_HARI);
  if (sekarang <= akhirTrial) return 'trial';
  const akhirTenggang = new Date(akhirTrial.getTime() + (opsi.tenggangHari ?? TENGGANG_HARI) * HARI);
  if (sekarang <= akhirTenggang) return 'tenggang';
  return 'kadaluarsa';
}

export function bolehAkses(s: StatusLangganan): boolean {
  return s === 'aktif' || s === 'trial' || s === 'tenggang';
}
