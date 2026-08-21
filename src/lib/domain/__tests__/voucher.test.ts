// src/lib/domain/__tests__/voucher.test.ts
import { describe, it, expect } from 'vitest';
import { hitungPotongan, validasiVoucher, adaCakupan } from '../voucher';

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

// Regresi nyata: voucher yang hanya memilih Langganan + Konsultasi ditolak seolah kosong,
// karena pemeriksaan cakupan tertinggal saat kedua cakupan itu ditambahkan.
describe('adaCakupan', () => {
  it('menerima Langganan saja', () => {
    expect(adaCakupan({ berlaku_langganan: true })).toBe(true);
  });
  it('menerima Konsultasi saja', () => {
    expect(adaCakupan({ berlaku_konsultasi: true })).toBe(true);
  });
  it('menerima Langganan + Konsultasi tanpa Event/Produk', () => {
    expect(adaCakupan({ berlaku_langganan: true, berlaku_konsultasi: true })).toBe(true);
  });
  it('menerima Event atau Produk seperti sebelumnya', () => {
    expect(adaCakupan({ berlaku_event: true })).toBe(true);
    expect(adaCakupan({ berlaku_produk: true })).toBe(true);
  });
  it('menolak bila tak ada cakupan sama sekali', () => {
    expect(adaCakupan({})).toBe(false);
    expect(adaCakupan({ berlaku_event: false, berlaku_produk: false, berlaku_langganan: false, berlaku_konsultasi: false })).toBe(false);
  });
});

describe('validasiVoucher — cakupan baru', () => {
  const dasar = { aktif: true, berlaku_dari: null, berlaku_sampai: null, berlaku_event: false, berlaku_produk: false };
  const hariIni = '2026-08-21';
  it('voucher langganan berlaku untuk jenis langganan', () => {
    expect(validasiVoucher({ ...dasar, berlaku_langganan: true }, { jenis: 'langganan', hariIni })).toBeNull();
  });
  it('voucher langganan TIDAK berlaku untuk konsultasi', () => {
    expect(validasiVoucher({ ...dasar, berlaku_langganan: true }, { jenis: 'konsultasi', hariIni }))
      .toBe('Voucher tidak berlaku untuk transaksi ini.');
  });
  it('voucher konsultasi berlaku untuk jenis konsultasi', () => {
    expect(validasiVoucher({ ...dasar, berlaku_konsultasi: true }, { jenis: 'konsultasi', hariIni })).toBeNull();
  });
});
