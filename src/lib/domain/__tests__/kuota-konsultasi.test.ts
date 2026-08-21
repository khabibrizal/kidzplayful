// src/lib/domain/__tests__/kuota-konsultasi.test.ts
import { describe, it, expect } from 'vitest';
import { sisaKuotaKonsultasi, labelKuotaKonsultasi } from '../kuota-konsultasi';

const bulanan = { konsultasi_gratis_jumlah: 2, konsultasi_gratis_satuan: 'bulan' as const };
const sekaliLangganan = { konsultasi_gratis_jumlah: 1, konsultasi_gratis_satuan: 'langganan' as const };

describe('sisaKuotaKonsultasi', () => {
  it('menghitung sisa dari terpakai', () => {
    expect(sisaKuotaKonsultasi(bulanan, 1, true)).toMatchObject({ punyaKuota: true, jumlah: 2, sisa: 1 });
  });

  it('kuota 0 berarti TIDAK ADA kuota gratis — bukan tanpa batas (beda dari worksheet)', () => {
    const k = sisaKuotaKonsultasi({ konsultasi_gratis_jumlah: 0, konsultasi_gratis_satuan: 'bulan' }, 0, true);
    expect(k.punyaKuota).toBe(false);
    expect(k.sisa).toBe(0);
  });

  it('bukan member = tak ada kuota, walau paketnya memberi', () => {
    expect(sisaKuotaKonsultasi(bulanan, 0, false)).toMatchObject({ punyaKuota: false, sisa: 0 });
  });

  it('tanpa paket = kosong', () => {
    expect(sisaKuotaKonsultasi(null, 0, true).punyaKuota).toBe(false);
  });

  it('terpakai melebihi kuota tidak menghasilkan angka minus', () => {
    expect(sisaKuotaKonsultasi(bulanan, 5, true).sisa).toBe(0);
  });

  it('label menyebut satuannya, dan membedakan habis vs tanpa kuota', () => {
    expect(labelKuotaKonsultasi(sisaKuotaKonsultasi(bulanan, 0, true))).toBe('2 dari 2 sesi gratis bulan ini');
    expect(labelKuotaKonsultasi(sisaKuotaKonsultasi(bulanan, 2, true))).toBe('kuota gratis habis bulan ini');
    expect(labelKuotaKonsultasi(sisaKuotaKonsultasi(sekaliLangganan, 0, true))).toBe('1 dari 1 sesi gratis selama langganan');
    expect(labelKuotaKonsultasi(sisaKuotaKonsultasi(bulanan, 0, false))).toBe('tanpa kuota gratis — sesi berbayar');
  });
});
