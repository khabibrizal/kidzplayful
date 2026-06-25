// src/lib/domain/__tests__/anak.test.ts
import { describe, it, expect } from 'vitest';
import { umurTahun, modeDefault } from '../anak';

const d = (s: string) => new Date(s + 'T00:00:00Z');

describe('umurTahun', () => {
  it('menghitung umur penuh dalam tahun', () => {
    expect(umurTahun(d('2023-06-10'), d('2026-06-10'))).toBe(3);
    expect(umurTahun(d('2024-07-01'), d('2026-06-10'))).toBe(1);
  });
});

describe('modeDefault', () => {
  it('umur < 2 -> ortu', () => expect(modeDefault(1)).toBe('ortu'));
  it('umur >= 2 -> anak', () => expect(modeDefault(2)).toBe('anak'));
});
