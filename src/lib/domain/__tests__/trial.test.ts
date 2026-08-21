// src/lib/domain/__tests__/trial.test.ts
import { describe, it, expect } from 'vitest';
import { computeTrialEnd, statusLangganan, TRIAL_HARI } from '../trial';

const d = (s: string) => new Date(s + 'T00:00:00Z');
const HARI = 24 * 60 * 60 * 1000;

describe('computeTrialEnd', () => {
  it('menambah TRIAL_HARI dari tanggal daftar', () => {
    const mulai = d('2026-06-01');
    const harap = new Date(mulai.getTime() + TRIAL_HARI * HARI);
    expect(computeTrialEnd(mulai).toISOString()).toBe(harap.toISOString());
  });
  it('menghormati jumlah hari yang diminta', () => {
    expect(computeTrialEnd(d('2026-06-01'), 30).toISOString()).toBe(d('2026-07-01').toISOString());
  });
});

// Perilaku lama (trial 14 hari) tetap diuji, tapi angkanya kini DINYATAKAN eksplisit
// lewat opsi — bukan mengandalkan konstanta yang bisa berubah karena keputusan produk.
describe('statusLangganan — trial 14 hari', () => {
  const trialMulai = d('2026-06-01');
  const o = { trialHari: 14 };
  it('trial saat masih dalam 14 hari', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-10'), o)).toBe('trial');
  });
  it('tenggang 0-3 hari setelah trial habis', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-17'), o)).toBe('tenggang');
  });
  it('kadaluarsa setelah tenggang', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-25'), o)).toBe('kadaluarsa');
  });
  it('aktif bila aktifSampai di masa depan', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: d('2026-12-31') }, d('2026-08-01'), o)).toBe('aktif');
  });
});

describe('statusLangganan — lama trial bisa diatur (30 hari)', () => {
  const trialMulai = d('2026-06-01');
  const o = { trialHari: 30 };
  it('masih trial di hari ke-24', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-25'), o)).toBe('trial');
  });
  it('tenggang tepat setelah 30 hari', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-07-02'), o)).toBe('tenggang');
  });
  it('kadaluarsa setelah 30 hari + tenggang', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-07-10'), o)).toBe('kadaluarsa');
  });
  it('lama tenggang juga bisa diatur', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-07-08'), { trialHari: 30, tenggangHari: 10 })).toBe('tenggang');
  });
});
