// src/lib/domain/__tests__/paginasi.test.ts
import { describe, it, expect } from 'vitest';
import { saringPaginasi, PER_HAL_ANAK } from '../paginasi';

const judul = (n: number) => ({ id: `i${n}`, judul: `Item ${n}` });
const banyak = Array.from({ length: 25 }, (_, i) => judul(i + 1));
const j = (x: { judul: string }) => x.judul;

describe('saringPaginasi', () => {
  it('memotong 10 per halaman', () => {
    const r = saringPaginasi(banyak, j, { hal: 1 });
    expect(PER_HAL_ANAK).toBe(10);
    expect(r.baris).toHaveLength(10);
    expect(r.baris[0].judul).toBe('Item 1');
    expect(r.total).toBe(25);
    expect(r.totalHal).toBe(3);
  });

  it('halaman terakhir berisi sisanya', () => {
    const r = saringPaginasi(banyak, j, { hal: 3 });
    expect(r.baris.map((x) => x.judul)).toEqual(['Item 21', 'Item 22', 'Item 23', 'Item 24', 'Item 25']);
  });

  it('MENYARING SELURUH data, bukan hanya halaman yang dibuka', () => {
    // "Item 23" ada di halaman 3. Mencarinya dari halaman 1 HARUS menemukannya —
    // inilah inti permintaan pemilik.
    const r = saringPaginasi(banyak, j, { q: 'item 23', hal: 1 });
    expect(r.baris.map((x) => x.judul)).toEqual(['Item 23']);
    expect(r.total).toBe(1);
  });

  it('pencarian tak peka besar-kecil huruf & spasi berlebih', () => {
    expect(saringPaginasi(banyak, j, { q: '  ITEM 7  ' }).baris.map((x) => x.judul)).toEqual(['Item 7']);
  });

  it('mencari sebagian judul (bukan harus sama persis)', () => {
    const r = saringPaginasi([{ judul: 'Main Pasir Kinetik' }, { judul: 'Meronce Manik' }], j, { q: 'pasir' });
    expect(r.baris.map((x) => x.judul)).toEqual(['Main Pasir Kinetik']);
  });

  it('halaman di luar rentang DIJEPIT ke halaman terakhir yang ada', () => {
    // Sesudah menyaring, halaman 5 bisa tak ada lagi; menampilkan halaman kosong membuat
    // pengguna mengira hasilnya nol.
    const r = saringPaginasi(banyak, j, { q: 'item 1', hal: 9 });
    expect(r.hal).toBe(r.totalHal);
    expect(r.baris.length).toBeGreaterThan(0);
  });

  it('halaman 0 / negatif / bukan angka jatuh ke halaman 1', () => {
    expect(saringPaginasi(banyak, j, { hal: 0 }).hal).toBe(1);
    expect(saringPaginasi(banyak, j, { hal: -3 }).hal).toBe(1);
    expect(saringPaginasi(banyak, j, { hal: NaN }).hal).toBe(1);
  });

  it('tanpa kata kunci: adaFilter false & seluruh data ikut dihitung', () => {
    const r = saringPaginasi(banyak, j, { q: '   ' });
    expect(r.adaFilter).toBe(false);
    expect(r.total).toBe(25);
  });

  it('kata kunci tanpa hasil: baris kosong tapi totalHal tetap 1 (bukan 0)', () => {
    const r = saringPaginasi(banyak, j, { q: 'tidak ada' });
    expect(r.baris).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.totalHal).toBe(1);
    expect(r.adaFilter).toBe(true);
  });

  it('daftar kosong / null aman', () => {
    expect(saringPaginasi([], j)).toMatchObject({ baris: [], total: 0, hal: 1, totalHal: 1 });
    expect(saringPaginasi(null, j)).toMatchObject({ baris: [], total: 0 });
  });

  it('judul kosong/null tak melempar', () => {
    const r = saringPaginasi([{ judul: '' }, { judul: 'ada' }], (x) => x.judul ?? '', { q: 'ada' });
    expect(r.baris.map((x) => x.judul)).toEqual(['ada']);
  });
});
