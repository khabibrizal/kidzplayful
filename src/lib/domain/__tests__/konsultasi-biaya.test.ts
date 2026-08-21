// src/lib/domain/__tests__/konsultasi-biaya.test.ts
import { describe, it, expect } from 'vitest';
import { hitungBiayaKonsultasi } from '../konsultasi-biaya';

const dasar = { tarif: 150000, diskonPersen: 20, member: false, sisaKuota: 0 };

describe('hitungBiayaKonsultasi', () => {
  it('non-member membayar tarif penuh — tanpa diskon member', () => {
    expect(hitungBiayaKonsultasi(dasar)).toMatchObject({ dariKuota: false, subtotal: 150000, total: 150000, diskonDipakai: 0 });
  });

  it('member mendapat diskon persen', () => {
    expect(hitungBiayaKonsultasi({ ...dasar, member: true })).toMatchObject({ subtotal: 120000, total: 120000, diskonDipakai: 20 });
  });

  it('kuota gratis dipakai lebih dulu, dan voucher TIDAK ikut hangus', () => {
    const h = hitungBiayaKonsultasi({ ...dasar, member: true, sisaKuota: 1, potonganVoucher: 50000 });
    expect(h).toMatchObject({ dariKuota: true, subtotal: 0, potongan: 0, total: 0 });
  });

  it('kuota hanya berlaku untuk member (non-member tetap bayar)', () => {
    // Sisa kuota milik paket; tanpa langganan aktif tak ada kuota yang bisa dipakai.
    expect(hitungBiayaKonsultasi({ ...dasar, sisaKuota: 3 }).dariKuota).toBe(false);
  });

  it('voucher memotong SESUDAH diskon member, dan tak boleh melebihi subtotal', () => {
    expect(hitungBiayaKonsultasi({ ...dasar, member: true, potonganVoucher: 20000 }).total).toBe(100000);
    expect(hitungBiayaKonsultasi({ ...dasar, member: true, potonganVoucher: 999999 })).toMatchObject({ potongan: 120000, total: 0 });
  });

  it('diskon member 100% → total 0 dan voucher tak terpakai', () => {
    const h = hitungBiayaKonsultasi({ ...dasar, member: true, diskonPersen: 100, potonganVoucher: 10000 });
    expect(h).toMatchObject({ subtotal: 0, potongan: 0, total: 0, dariKuota: false });
  });

  it('tarif belum diisi pemilik → 0, bukan galat', () => {
    expect(hitungBiayaKonsultasi({ ...dasar, tarif: 0 })).toMatchObject({ subtotal: 0, total: 0 });
  });

  it('diskon di luar 0–100 dijepit', () => {
    expect(hitungBiayaKonsultasi({ ...dasar, member: true, diskonPersen: -5 }).subtotal).toBe(150000);
    expect(hitungBiayaKonsultasi({ ...dasar, member: true, diskonPersen: 250 }).subtotal).toBe(0);
  });
});
