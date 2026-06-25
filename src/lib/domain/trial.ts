// src/lib/domain/trial.ts
export const TRIAL_HARI = 14;
export const TENGGANG_HARI = 3;

const HARI = 24 * 60 * 60 * 1000;

export function computeTrialEnd(trialMulai: Date): Date {
  return new Date(trialMulai.getTime() + TRIAL_HARI * HARI);
}

export type StatusLangganan = 'aktif' | 'trial' | 'tenggang' | 'kadaluarsa';

export function statusLangganan(
  l: { trialMulai: Date; aktifSampai: Date | null },
  sekarang: Date,
): StatusLangganan {
  if (l.aktifSampai && sekarang <= l.aktifSampai) return 'aktif';
  const akhirTrial = computeTrialEnd(l.trialMulai);
  if (sekarang <= akhirTrial) return 'trial';
  const akhirTenggang = new Date(akhirTrial.getTime() + TENGGANG_HARI * HARI);
  if (sekarang <= akhirTenggang) return 'tenggang';
  return 'kadaluarsa';
}

export function bolehAkses(s: StatusLangganan): boolean {
  return s === 'aktif' || s === 'trial' || s === 'tenggang';
}
