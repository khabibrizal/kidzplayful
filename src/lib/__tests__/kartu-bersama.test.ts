// src/lib/__tests__/kartu-bersama.test.ts
import { describe, it, expect } from 'vitest';
import { bungkusTeks, bungkusUkur, ukuranPas, type PengukurTeks } from '../kartu-bersama';

/** Pengukur palsu: lebar = jumlah karakter × (ukuran font / 2). Cukup untuk menguji logika. */
function pengukur(): PengukurTeks {
  return {
    font: '',
    measureText(teks: string) {
      const px = Number(/(\d+)px/.exec(this.font)?.[1] ?? 10);
      return { width: teks.length * (px / 2) };
    },
  };
}

describe('bungkusTeks', () => {
  it('kalimat pendek → 1 baris', () => {
    expect(bungkusTeks('Halo dunia', 20)).toEqual(['Halo dunia']);
  });
  it('pecah beberapa baris sesuai batas', () => {
    expect(bungkusTeks('satu dua tiga empat', 9)).toEqual(['satu dua', 'tiga', 'empat']);
  });
  it('kata lebih panjang dari batas tetap satu baris utuh', () => {
    expect(bungkusTeks('superkalifragilistik', 5)).toEqual(['superkalifragilistik']);
  });
  it('string kosong/whitespace → []', () => {
    expect(bungkusTeks('   ', 10)).toEqual([]);
    expect(bungkusTeks('', 10)).toEqual([]);
  });
});

describe('bungkusUkur', () => {
  it('memecah berdasarkan lebar terukur', () => {
    const ctx = pengukur(); ctx.font = '10px x';   // 1 karakter = 5px
    expect(bungkusUkur(ctx, 'satu dua tiga', 45)).toEqual(['satu dua', 'tiga']);
  });
  it('melebihi maksBaris → baris terakhir dipotong dengan elipsis', () => {
    const ctx = pengukur(); ctx.font = '10px x';
    const baris = bungkusUkur(ctx, 'aaa bbb ccc ddd', 20, 2);
    expect(baris).toHaveLength(2);
    expect(baris[1].endsWith('…')).toBe(true);
  });
});

describe('ukuranPas — penjamin "tidak ada yang terpotong"', () => {
  const font = (px: number) => `800 ${px}px x`;

  it('memakai ukuran terbesar yang masih muat', () => {
    const ctx = pengukur();
    // "Halo" = 4 karakter; pada 40px lebarnya 80 → muat di kolom 80.
    const { px, baris } = ukuranPas(ctx, 'Halo', 80, 1, font, 60, 20);
    expect(px).toBe(40);
    expect(baris).toEqual(['Halo']);
  });

  it('mengecilkan font sampai SATU kata panjang muat di kolom', () => {
    const ctx = pengukur();
    // "Neurodivergent?" = 15 karakter. Di kolom 120px butuh px ≤ 16.
    const { px, baris } = ukuranPas(ctx, 'Neurodivergent?', 120, 2, font, 74, 10);
    expect(baris).toHaveLength(1);
    expect(baris[0].length * (px / 2)).toBeLessThanOrEqual(120);
  });

  it('tidak pernah melewati lebar kolom untuk judul panjang', () => {
    const ctx = pengukur();
    const judul = 'Apakah Neurodivergent Itu Kecacatan Pada Anak Usia Dini';
    const { px, baris } = ukuranPas(ctx, judul, 300, 3, font, 74, 20);
    expect(baris.length).toBeLessThanOrEqual(3);
    for (const b of baris) expect(b.length * (px / 2)).toBeLessThanOrEqual(300);
  });

  it('menghormati batas bawah ukuran font meski teks tetap tak muat', () => {
    const ctx = pengukur();
    const { px } = ukuranPas(ctx, 'katayangsangatpanjangsekali', 20, 1, font, 40, 24);
    expect(px).toBe(24);   // berhenti di pxMin, tidak mengecil tanpa batas
  });
});
