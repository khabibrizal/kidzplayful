// src/lib/domain/__tests__/laporan-anak.test.ts
import { describe, it, expect } from 'vitest';
import { laporanAnak } from '../laporan-anak';

describe('laporanAnak', () => {
  it('agregasi sesi, bintang, menit, per area', () => {
    const r = laporanAnak([
      { area_skill: 'kognitif', bintang: 3, durasi_detik: 120, selesai: true },
      { area_skill: 'kognitif', bintang: 2, durasi_detik: 60, selesai: true },
      { area_skill: 'motorik-halus', bintang: 1, durasi_detik: 30, selesai: true },
    ]);
    expect(r.totalSesi).toBe(3);
    expect(r.totalBintang).toBe(6);
    expect(r.totalMenit).toBe(4); // (120+60+30)/60 = 3.5 -> round 4
    expect(r.perArea['kognitif']).toBe(2);
    expect(r.perArea['motorik-halus']).toBe(1);
  });
  it('aman bila kosong', () => {
    const r = laporanAnak([]);
    expect(r.totalSesi).toBe(0); expect(r.totalBintang).toBe(0); expect(r.totalMenit).toBe(0);
  });
});
