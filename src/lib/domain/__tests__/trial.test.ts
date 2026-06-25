// src/lib/domain/__tests__/trial.test.ts
import { describe, it, expect } from 'vitest';
import { computeTrialEnd, statusLangganan } from '../trial';

const d = (s: string) => new Date(s + 'T00:00:00Z');

describe('computeTrialEnd', () => {
  it('menambah 14 hari dari tanggal daftar', () => {
    expect(computeTrialEnd(d('2026-06-01')).toISOString()).toBe(d('2026-06-15').toISOString());
  });
});

describe('statusLangganan', () => {
  const trialMulai = d('2026-06-01');
  it('trial saat masih dalam 14 hari', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-10'))).toBe('trial');
  });
  it('tenggang 0-3 hari setelah trial habis', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-17'))).toBe('tenggang');
  });
  it('kadaluarsa setelah tenggang', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-25'))).toBe('kadaluarsa');
  });
  it('aktif bila aktifSampai di masa depan', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: d('2026-12-31') }, d('2026-08-01'))).toBe('aktif');
  });
});
