// src/lib/domain/__tests__/kuota-worksheet.test.ts
import { describe, it, expect } from 'vitest';
import { awalPeriode, sisaKuotaWorksheet } from '../kuota-worksheet';

describe('awalPeriode', () => {
  it('satuan bulan → awal bulan berjalan (WIB)', () => {
    // 5 Agu 2026 07:00 WIB → awal periode 1 Agu 2026 00:00 WIB (= 31 Jul 17:00 UTC)
    expect(awalPeriode('bulan', new Date('2026-08-05T00:00:00Z'))).toBe('2026-07-31T17:00:00.000Z');
  });
  it('satuan langganan → sejak awal (null)', () => {
    expect(awalPeriode('langganan', new Date('2026-08-05T00:00:00Z'))).toBeNull();
  });
});

describe('sisaKuotaWorksheet', () => {
  const paket = (worksheet: boolean, jumlah: number) =>
    ({ worksheet, worksheet_kuota_jumlah: jumlah, worksheet_kuota_satuan: 'bulan' as const });

  it('paket tanpa hak worksheet → tidak boleh, sisa 0', () => {
    expect(sisaKuotaWorksheet(paket(false, 5), 0)).toEqual({ boleh: false, tanpaBatas: false, sisa: 0 });
  });

  it('kuota 0 berarti TANPA BATAS', () => {
    expect(sisaKuotaWorksheet(paket(true, 0), 99)).toEqual({ boleh: true, tanpaBatas: true, sisa: null });
  });

  it('kuota 3 dengan 1 terpakai → sisa 2', () => {
    expect(sisaKuotaWorksheet(paket(true, 3), 1)).toEqual({ boleh: true, tanpaBatas: false, sisa: 2 });
  });

  it('kuota habis → tidak boleh', () => {
    expect(sisaKuotaWorksheet(paket(true, 3), 3)).toEqual({ boleh: false, tanpaBatas: false, sisa: 0 });
  });

  it('terpakai melebihi kuota tidak membuat sisa negatif', () => {
    expect(sisaKuotaWorksheet(paket(true, 2), 5)).toEqual({ boleh: false, tanpaBatas: false, sisa: 0 });
  });

  it('tanpa paket (bukan pelanggan) → tidak boleh', () => {
    expect(sisaKuotaWorksheet(null, 0)).toEqual({ boleh: false, tanpaBatas: false, sisa: 0 });
  });
});
