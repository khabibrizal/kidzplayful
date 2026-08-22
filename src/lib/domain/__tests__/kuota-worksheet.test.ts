// src/lib/domain/__tests__/kuota-worksheet.test.ts
import { describe, it, expect } from 'vitest';
import { awalPeriode, sisaKuotaWorksheet, sisaWorksheetAkun } from '../kuota-worksheet';

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

describe('sisaWorksheetAkun — hak unduh per MODE', () => {
  const paketPenuh = { worksheet: true, worksheet_kuota_jumlah: 0, worksheet_kuota_satuan: 'bulan' as const };
  const paketBerkuota = { worksheet: true, worksheet_kuota_jumlah: 5, worksheet_kuota_satuan: 'bulan' as const };
  const paketMati = { worksheet: false, worksheet_kuota_jumlah: 0, worksheet_kuota_satuan: 'bulan' as const };

  it('BUKAN pelanggan tak boleh mengunduh, walau paketnya tanpa batas', () => {
    // Ini bug yang diperbaiki: hak dulu hanya melihat "ada paket", jadi paket trial (atau
    // materi bertanda contoh gratis) membuka unduhan untuk yang bukan pelanggan.
    const r = sisaWorksheetAkun({ mode: 'tidak', paket: paketPenuh, terpakaiPeriode: 0, terpakaiTotal: 0 });
    expect(r.boleh).toBe(false);
    expect(r.sisa).toBe(0);
  });

  it('TRIAL hanya dapat satu unduhan, seumur trial', () => {
    const awal = sisaWorksheetAkun({ mode: 'trial', paket: paketPenuh, terpakaiPeriode: 0, terpakaiTotal: 0 });
    expect(awal).toMatchObject({ mode: 'trial', boleh: true, tanpaBatas: false, sisa: 1 });

    const sesudah = sisaWorksheetAkun({ mode: 'trial', paket: paketPenuh, terpakaiPeriode: 0, terpakaiTotal: 1 });
    expect(sesudah.boleh).toBe(false);
    expect(sesudah.sisa).toBe(0);
  });

  it('plafon trial dihitung dari SELURUH riwayat, bukan periode berjalan', () => {
    // Kalau dihitung per bulan, trial yang menyeberang bulan mendapat jatah dua kali.
    const r = sisaWorksheetAkun({ mode: 'trial', paket: paketPenuh, terpakaiPeriode: 0, terpakaiTotal: 3 });
    expect(r.boleh).toBe(false);
  });

  it('plafon trial MENGURANGI, tak pernah menambah: paket tanpa hak tetap nol', () => {
    const r = sisaWorksheetAkun({ mode: 'trial', paket: paketMati, terpakaiPeriode: 0, terpakaiTotal: 0 });
    expect(r.boleh).toBe(false);
    expect(r.sisa).toBe(0);
  });

  it('MEMBER memakai kuota paketnya seperti biasa', () => {
    expect(sisaWorksheetAkun({ mode: 'member', paket: paketPenuh, terpakaiPeriode: 99, terpakaiTotal: 99 }))
      .toMatchObject({ mode: 'member', boleh: true, tanpaBatas: true, sisa: null });
    expect(sisaWorksheetAkun({ mode: 'member', paket: paketBerkuota, terpakaiPeriode: 2, terpakaiTotal: 40 }))
      .toMatchObject({ boleh: true, tanpaBatas: false, sisa: 3 });
    expect(sisaWorksheetAkun({ mode: 'member', paket: paketBerkuota, terpakaiPeriode: 5, terpakaiTotal: 5 }).boleh)
      .toBe(false);
  });

  it('member TIDAK dibatasi plafon trial — riwayat lamanya tak ikut menghukum', () => {
    // Orang tua yang dulu trial lalu berlangganan punya `terpakaiTotal` > 1.
    const r = sisaWorksheetAkun({ mode: 'member', paket: paketBerkuota, terpakaiPeriode: 0, terpakaiTotal: 9 });
    expect(r.boleh).toBe(true);
    expect(r.sisa).toBe(5);
  });

  it('paket kosong → tak boleh, apa pun modenya', () => {
    for (const mode of ['member', 'trial', 'tidak'] as const) {
      expect(sisaWorksheetAkun({ mode, paket: null, terpakaiPeriode: 0, terpakaiTotal: 0 }).boleh).toBe(false);
    }
  });
});
