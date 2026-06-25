// src/lib/domain/__tests__/usia.test.ts
import { describe, it, expect } from 'vitest';
import { cocokUsia } from '../usia';

describe('cocokUsia', () => {
  it('true bila umur dalam rentang', () => expect(cocokUsia(3, 2, 4)).toBe(true));
  it('true di batas bawah/atas', () => {
    expect(cocokUsia(2, 2, 4)).toBe(true);
    expect(cocokUsia(4, 2, 4)).toBe(true);
  });
  it('false di luar rentang', () => {
    expect(cocokUsia(1, 2, 4)).toBe(false);
    expect(cocokUsia(5, 2, 4)).toBe(false);
  });
});
