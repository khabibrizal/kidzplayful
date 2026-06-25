// src/lib/domain/__tests__/waktu.test.ts
import { describe, it, expect } from 'vitest';
import { sisaDetik, waktuHabis, kunciHari } from '../waktu';

describe('waktu', () => {
  it('sisa = batas*60 - terpakai (>=0)', () => {
    expect(sisaDetik(60, 20)).toBe(20 * 60 - 60);
    expect(sisaDetik(9999, 20)).toBe(0);
  });
  it('habis bila terpakai >= batas', () => {
    expect(waktuHabis(20 * 60, 20)).toBe(true);
    expect(waktuHabis(10, 20)).toBe(false);
  });
  it('kunci hari berbeda per tanggal+anak', () => {
    expect(kunciHari('abc', new Date('2026-06-10T05:00:00Z'))).toBe('kp_waktu_abc_2026-06-10');
  });
});
