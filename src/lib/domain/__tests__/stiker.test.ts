import { describe, it, expect } from 'vitest';
import { ukuranNama } from '../stiker';

describe('ukuranNama — ukuran font nama di stiker', () => {
  it('nama panggilan pendek (mayoritas) memakai ukuran terbesar', () => {
    for (const n of ['Aa', 'Bila', 'Nayla', 'Bagas', 'Muhammad']) expect(ukuranNama(n)).toBe(34);
  });

  it('dua kata yang masih muat 2 baris tetap terbesar', () => {
    expect(ukuranNama('Muhammad Zaki')).toBe(34);   // 13 kar, kata terpanjang 8
    expect(ukuranNama('Alesha Putri')).toBe(34);
  });

  it('kata tunggal yang lebih lebar dari satu baris mengecil — cegah kata terpenggal', () => {
    // "Puspaningrum" (12) > kapasitas 11 pada 34pt → turun satu tangga
    expect(ukuranNama('Kirania Puspaningrum')).toBe(28);
    expect(ukuranNama('Muhammadinsyaallah')).toBeLessThan(34);
  });

  it('nama sangat panjang turun sampai ukuran terkecil, tidak pernah di bawahnya', () => {
    expect(ukuranNama('Kirania Puspaningrum Wijayakusuma')).toBe(19);
    expect(ukuranNama('A'.repeat(80))).toBe(19);
  });

  it('spasi berlebih tidak mengubah keputusan', () => {
    expect(ukuranNama('  Bila  ')).toBe(ukuranNama('Bila'));
  });

  it('nama kosong tidak melempar', () => {
    expect(ukuranNama('')).toBe(34);
  });
});
