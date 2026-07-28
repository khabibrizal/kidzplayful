// src/lib/domain/__tests__/voucher.test.ts
import { describe, it, expect } from 'vitest';
import { hitungPotongan, validasiVoucher } from '../voucher';

describe('hitungPotongan', () => {
  it('nominal di-clamp <= subtotal', () => {
    expect(hitungPotongan({ tipe: 'nominal', nilai: 20000 }, 50000)).toBe(20000);
    expect(hitungPotongan({ tipe: 'nominal', nilai: 90000 }, 50000)).toBe(50000);
  });
  it('persen floor & clamp 0-100', () => {
    expect(hitungPotongan({ tipe: 'persen', nilai: 15 }, 50000)).toBe(7500);
    expect(hitungPotongan({ tipe: 'persen', nilai: 150 }, 50000)).toBe(50000);
  });
  it('subtotal 0 → 0', () => {
    expect(hitungPotongan({ tipe: 'persen', nilai: 15 }, 0)).toBe(0);
  });
});

describe('validasiVoucher', () => {
  const base = { aktif: true, berlaku_dari: null, berlaku_sampai: null, berlaku_event: true, berlaku_produk: false };
  const ctx = { jenis: 'event' as const, hariIni: '2026-07-24' };
  it('valid → null', () => { expect(validasiVoucher(base, ctx)).toBeNull(); });
  it('nonaktif', () => { expect(validasiVoucher({ ...base, aktif: false }, ctx)).toMatch(/tidak aktif/i); });
  it('kadaluarsa', () => { expect(validasiVoucher({ ...base, berlaku_sampai: '2026-07-23' }, ctx)).toMatch(/kadaluarsa/i); });
  it('belum berlaku', () => { expect(validasiVoucher({ ...base, berlaku_dari: '2026-07-25' }, ctx)).toMatch(/belum berlaku/i); });
  it('jenis tak cocok (produk pada voucher event-only)', () => {
    expect(validasiVoucher(base, { jenis: 'produk', hariIni: '2026-07-24' })).toMatch(/tidak berlaku/i);
  });
});
