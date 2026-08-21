// src/lib/domain/__tests__/langganan-harga.test.ts
// Ini pengaman UTAMA sub-proyek A2: menyangkut uang, jadi diuji sebagai unit — bukan
// diperiksa manual di layar.
import { describe, it, expect } from 'vitest';
import { hitungTagihan } from '../langganan-harga';
import type { PaketLangganan, AturanKeluarga } from '@/lib/game/tipe';

const paket = (kode: string, urutan: number, harga: number, keluarga: AturanKeluarga[] = []): PaketLangganan => ({
  id: `id-${kode}`, kode, nama: kode, deskripsi: null, benefit: [], harga_bulanan: harga,
  diskon_keluarga: keluarga, akses_ide_bermain: true, akses_game: true, akses_video: true,
  akses_komunitas: true, worksheet: false, konsultasi_gratis_jumlah: 0,
  worksheet_kuota_jumlah: 0, worksheet_kuota_satuan: 'bulan',
  konsultasi_gratis_satuan: 'bulan', rapor_bulanan: false, urutan, aktif: true,
});

const BASIC = paket('basic', 10, 75000, [{ min_anak: 2, persen: 5 }]);
const PRESCHOOL = paket('preschool', 20, 120000, [
  { min_anak: 2, persen: 10 },
  { min_anak: 4, nominal: 60000 },
]);

describe('hitungTagihan — dasar', () => {
  it('satu anak: total = harga paket', () => {
    const r = hitungTagihan({ item: [{ anakId: 'a1', paket: PRESCHOOL }] });
    expect(r.subtotal).toBe(120000);
    expect(r.diskonKeluarga).toBe(0);
    expect(r.total).toBe(120000);
    expect(r.aturanDipakai).toBeNull();
  });

  it('tanpa item: semuanya nol', () => {
    const r = hitungTagihan({ item: [] });
    expect(r).toMatchObject({ subtotal: 0, diskonKeluarga: 0, potonganVoucher: 0, total: 0 });
  });

  it('mengalikan dengan jumlah bulan', () => {
    const r = hitungTagihan({ item: [{ anakId: 'a1', paket: BASIC }], bulan: 3 });
    expect(r.subtotal).toBe(225000);
    expect(r.total).toBe(225000);
  });
});

describe('hitungTagihan — diskon keluarga', () => {
  it('dua anak paket sama memakai aturan paket itu', () => {
    const r = hitungTagihan({ item: [
      { anakId: 'a1', paket: PRESCHOOL }, { anakId: 'a2', paket: PRESCHOOL },
    ] });
    expect(r.subtotal).toBe(240000);
    expect(r.diskonKeluarga).toBe(24000);          // 10%
    expect(r.total).toBe(216000);
    expect(r.aturanDipakai).toEqual({ min_anak: 2, persen: 10 });
  });

  it('paket CAMPUR memakai aturan paket TERTINGGI di tagihan', () => {
    const r = hitungTagihan({ item: [
      { anakId: 'a1', paket: PRESCHOOL }, { anakId: 'a2', paket: BASIC },
    ] });
    expect(r.subtotal).toBe(195000);
    expect(r.diskonKeluarga).toBe(19500);          // 10% (Preschool), bukan 5% (Basic)
    expect(r.total).toBe(175500);
  });

  it('aturan bertingkat: yang batasnya TERBESAR & terpenuhi yang dipakai', () => {
    const item = ['a1', 'a2', 'a3', 'a4'].map((anakId) => ({ anakId, paket: PRESCHOOL }));
    const r = hitungTagihan({ item });
    expect(r.subtotal).toBe(480000);
    expect(r.diskonKeluarga).toBe(60000);          // aturan nominal untuk >= 4 anak
    expect(r.aturanDipakai).toEqual({ min_anak: 4, nominal: 60000 });
  });

  it('batas belum terpenuhi → tanpa diskon keluarga', () => {
    const r = hitungTagihan({ item: [{ anakId: 'a1', paket: BASIC }] });
    expect(r.diskonKeluarga).toBe(0);
  });

  it('paket tanpa aturan keluarga → tanpa diskon', () => {
    const tanpa = paket('polos', 5, 50000, []);
    const r = hitungTagihan({ item: [{ anakId: 'a1', paket: tanpa }, { anakId: 'a2', paket: tanpa }] });
    expect(r.subtotal).toBe(100000);
    expect(r.diskonKeluarga).toBe(0);
  });

  it('diskon keluarga tidak boleh melebihi subtotal', () => {
    const mahal = paket('mahal', 5, 10000, [{ min_anak: 2, nominal: 999999 }]);
    const r = hitungTagihan({ item: [{ anakId: 'a1', paket: mahal }, { anakId: 'a2', paket: mahal }] });
    expect(r.diskonKeluarga).toBe(20000);
    expect(r.total).toBe(0);
  });
});

describe('hitungTagihan — voucher', () => {
  const dua = [{ anakId: 'a1', paket: PRESCHOOL }, { anakId: 'a2', paket: PRESCHOOL }];

  it('voucher persen dihitung SETELAH diskon keluarga', () => {
    const r = hitungTagihan({ item: dua, voucher: { tipe: 'persen', nilai: 10 } });
    expect(r.diskonKeluarga).toBe(24000);
    expect(r.potonganVoucher).toBe(21600);         // 10% dari 216.000, bukan dari 240.000
    expect(r.total).toBe(194400);
  });

  it('voucher nominal', () => {
    const r = hitungTagihan({ item: dua, voucher: { tipe: 'nominal', nilai: 25000 } });
    expect(r.potonganVoucher).toBe(25000);
    expect(r.total).toBe(191000);
  });

  it('voucher lebih besar dari tagihan tidak membuat total minus', () => {
    const r = hitungTagihan({ item: [{ anakId: 'a1', paket: BASIC }], voucher: { tipe: 'nominal', nilai: 999999 } });
    expect(r.potonganVoucher).toBe(75000);
    expect(r.total).toBe(0);
  });

  it('voucher persen di luar 0-100 dijaga', () => {
    const r = hitungTagihan({ item: [{ anakId: 'a1', paket: BASIC }], voucher: { tipe: 'persen', nilai: 150 } });
    expect(r.total).toBe(0);
  });
});
