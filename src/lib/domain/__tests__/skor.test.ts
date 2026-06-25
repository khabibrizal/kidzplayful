// src/lib/domain/__tests__/skor.test.ts
import { describe, it, expect } from 'vitest';
import { hitungBintang } from '../skor';

describe('hitungBintang', () => {
  it('3 bintang bila semua benar', () => expect(hitungBintang(5, 5)).toBe(3));
  it('2 bintang bila >= 60%', () => expect(hitungBintang(3, 5)).toBe(2));
  it('1 bintang bila < 60%', () => expect(hitungBintang(1, 5)).toBe(1));
  it('minimal 1 bintang walau 0 benar', () => expect(hitungBintang(0, 5)).toBe(1));
  it('aman bila total 0', () => expect(hitungBintang(0, 0)).toBe(1));
});
