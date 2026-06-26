// src/lib/domain/__tests__/laporan.test.ts
import { describe, it, expect } from 'vitest';
import { ringkasanLangganan } from '../laporan';

const d = (s: string) => new Date(s + 'T00:00:00Z');
const now = d('2026-06-20');

describe('ringkasanLangganan', () => {
  it('menghitung status efektif + MRR', () => {
    const r = ringkasanLangganan([
      { trial_mulai: '2026-06-18', aktif_sampai: null, nominal: 0 },     // trial
      { trial_mulai: '2026-05-01', aktif_sampai: '2026-12-31', nominal: 35000 }, // aktif
      { trial_mulai: '2026-06-01', aktif_sampai: null, nominal: 0 },     // 2026-06-15 trial end -> +3 tenggang = 18 -> 20 kadaluarsa
    ], now);
    expect(r.aktif).toBe(1);
    expect(r.trial).toBe(1);
    expect(r.kadaluarsa).toBe(1);
    expect(r.mrr).toBe(35000);
    expect(r.total).toBe(3);
  });
});
