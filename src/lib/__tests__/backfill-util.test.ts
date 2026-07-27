// src/lib/__tests__/backfill-util.test.ts
import { describe, it, expect } from 'vitest';
import { perluKompres } from '../../../tools/backfill-util.mjs';

const MB = 1024 * 1024;
describe('perluKompres', () => {
  it('terima jpg/png besar di folder biasa', () => {
    expect(perluKompres('produk/a.jpg', 2 * MB)).toBe(true);
    expect(perluKompres('bukti/x.png', 1 * MB)).toBe(true);
  });
  it('skip webp (sudah efisien)', () => {
    expect(perluKompres('produk/a.webp', 2 * MB)).toBe(false);
  });
  it('skip file kecil (<300KB)', () => {
    expect(perluKompres('produk/a.jpg', 100 * 1024)).toBe(false);
  });
  it('skip template sertifikat & stiker', () => {
    expect(perluKompres('event/sertifikat-1.jpg', 2 * MB)).toBe(false);
    expect(perluKompres('event/stiker-1.png', 2 * MB)).toBe(false);
  });
  it('skip non-gambar (pdf/svg)', () => {
    expect(perluKompres('dok-sponsor/a.pdf', 2 * MB)).toBe(false);
  });
});
