// src/lib/domain/__tests__/laporan-bulanan.test.ts
import { describe, it, expect } from 'vitest';
import { rentangBulan, ringkasBulan, labelBulan, bulanTerakhir } from '../laporan-bulanan';

describe('rentangBulan', () => {
  it('memberi awal & akhir bulan dalam WIB', () => {
    const r = rentangBulan('2026-08');
    // 1 Agu 2026 00:00 WIB = 31 Jul 17:00 UTC; batas akhir = 1 Sep 00:00 WIB
    expect(r.dari).toBe('2026-07-31T17:00:00.000Z');
    expect(r.sampai).toBe('2026-08-31T17:00:00.000Z');
  });
  it('menangani Desember → Januari tahun berikutnya', () => {
    const r = rentangBulan('2026-12');
    expect(r.dari).toBe('2026-11-30T17:00:00.000Z');
    expect(r.sampai).toBe('2026-12-31T17:00:00.000Z');
  });
  it('ym tak sah → bulan berjalan tidak melempar', () => {
    expect(() => rentangBulan('bukan-bulan')).not.toThrow();
  });
});

describe('labelBulan', () => {
  it('menulis nama bulan Indonesia', () => {
    expect(labelBulan('2026-08')).toBe('Agustus 2026');
    expect(labelBulan('2026-01')).toBe('Januari 2026');
  });
});

describe('bulanTerakhir', () => {
  it('mengembalikan N bulan menurun dari bulan berjalan', () => {
    expect(bulanTerakhir(new Date('2026-08-15T00:00:00Z'), 3)).toEqual(['2026-08', '2026-07', '2026-06']);
  });
  it('menyeberangi tahun', () => {
    expect(bulanTerakhir(new Date('2026-01-10T00:00:00Z'), 2)).toEqual(['2026-01', '2025-12']);
  });
});

describe('ringkasBulan', () => {
  const dasar = {
    kegiatan: [
      { jenis: 'ide-bermain' as const, judul: 'Main Air', waktu: '2026-08-02T03:00:00Z' },
      { jenis: 'ide-bermain' as const, judul: 'Main Air', waktu: '2026-08-05T03:00:00Z' },
      { jenis: 'video' as const, judul: 'Lagu Warna', waktu: '2026-08-06T03:00:00Z' },
    ],
    hasilMain: [
      { area_skill: 'kognitif', bintang: 3, durasi_detik: 60, selesai: true },
      { area_skill: 'kognitif', bintang: 2, durasi_detik: 40, selesai: true },
      { area_skill: 'motorik-halus', bintang: 1, durasi_detik: 30, selesai: false },
    ],
    catatan: [{
      judulEvent: 'Kelas Sensorik', dinilai_oleh: 'Bu Ratih',
      penilaian: [{ area: 'Sensorik', indikator: 'Berani menyentuh tekstur baru', nilai: 'BSH' }],
      catatan: 'Sudah mau mencoba pasir kinetik.',
    }],
    event: ['Kelas Sensorik'],
    rekomendasi: 2,
  };

  it('menghitung jumlah kegiatan per jenis', () => {
    const r = ringkasBulan(dasar);
    expect(r.totalKegiatan).toBe(3);
    expect(r.ideBermain).toBe(2);
    expect(r.video).toBe(1);
  });

  it('mengelompokkan Ide Bermain unik beserta jumlah pengulangannya', () => {
    const r = ringkasBulan(dasar);
    expect(r.daftarIdeBermain).toEqual([{ judul: 'Main Air', jumlah: 2 }]);
  });

  it('menghitung sesi game, bintang, menit, dan per area', () => {
    const r = ringkasBulan(dasar);
    expect(r.totalSesi).toBe(3);
    expect(r.totalBintang).toBe(6);
    expect(r.totalMenit).toBe(2);          // 130 detik → 2 menit
    expect(r.perArea).toEqual({ kognitif: 2, 'motorik-halus': 1 });
    expect(r.areaTerbanyak).toBe('kognitif');
  });

  it('membawa catatan guru, event, dan jumlah rekomendasi', () => {
    const r = ringkasBulan(dasar);
    expect(r.catatanGuru).toHaveLength(1);
    expect(r.catatanGuru[0].penilaian).toEqual([{ area: 'Sensorik', indikator: 'Berani menyentuh tekstur baru', nilai: 'BSH' }]);
    expect(r.catatanGuru[0].catatan).toBe('Sudah mau mencoba pasir kinetik.');
    expect(r.event).toEqual(['Kelas Sensorik']);
    expect(r.rekomendasi).toBe(2);
  });

  it('membawa rekomendasi psikolog & item apa adanya', () => {
    const r = ringkasBulan({
      ...dasar,
      rekomendasiPsikolog: [{ judul: 'Latihan motorik', isi: 'Ajak meronce.', butir: [{ judul: 'Pagi', isi: '10 menit' }], oleh: 'Arina, M.Psi.' }],
      rekomendasiItem: [
        { jenis: 'produk', judul: 'Papan Meronce', catatan: null, oleh: 'Arina, M.Psi.' },
        { jenis: 'materi', judul: 'Main Pasir', catatan: 'seminggu 2x', oleh: 'Arina, M.Psi.' },
      ],
    });
    expect(r.rekomendasiPsikolog[0].butir).toEqual([{ judul: 'Pagi', isi: '10 menit' }]);
    expect(r.rekomendasiItem.map((i) => i.jenis)).toEqual(['produk', 'materi']);
  });

  it('bulan yang HANYA berisi rekomendasi tetap layak dicetak', () => {
    const r = ringkasBulan({
      kegiatan: [], hasilMain: [], catatan: [], event: [], rekomendasi: 1,
      rekomendasiItem: [{ jenis: 'event', judul: 'Kelas Musik', catatan: null, oleh: null }],
    });
    expect(r.adaIsi).toBe(true);
  });

  it('bulan kosong menghasilkan nol, bukan galat', () => {
    const r = ringkasBulan({ kegiatan: [], hasilMain: [], catatan: [], event: [], rekomendasi: 0 });
    expect(r).toMatchObject({ totalKegiatan: 0, totalSesi: 0, totalBintang: 0, totalMenit: 0, areaTerbanyak: null });
    expect(r.adaIsi).toBe(false);
  });

  it('adaIsi true bila ada kegiatan ATAU sesi game', () => {
    expect(ringkasBulan({ ...dasar, hasilMain: [] }).adaIsi).toBe(true);
    expect(ringkasBulan({ ...dasar, kegiatan: [] }).adaIsi).toBe(true);
  });
});
