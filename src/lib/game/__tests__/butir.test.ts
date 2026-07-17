// src/lib/game/__tests__/butir.test.ts
import { describe, it, expect } from 'vitest';
import { butirDariForm, validasiButir } from '../butir';

describe('butirDariForm tekan-sesuai', () => {
  it('membentuk struktur soal', () => {
    const b = butirDariForm('tekan-sesuai', {
      soal: [{ tanya: 'kucing', benar: '🐱', salah: ['🐶', '🐮', '🐰'] }],
    });
    expect(b).toEqual({ soal: [{ tanya: 'kucing', benar: '🐱', salah: ['🐶', '🐮', '🐰'] }] });
  });
});

describe('validasiButir', () => {
  it('tekan-sesuai butuh >=1 soal lengkap', () => {
    expect(validasiButir('tekan-sesuai', { soal: [] })).toMatch(/minimal/i);
    expect(validasiButir('tekan-sesuai', { soal: [{ tanya: 'a', benar: '🐱', salah: ['🐶'] }] })).toBe('');
  });
  it('seret-wadah butuh wadah & benda', () => {
    expect(validasiButir('seret-wadah', { wadah: [], benda: [] })).toMatch(/wadah/i);
  });
  it('cari-pasangan butuh >=2 pasangan', () => {
    expect(validasiButir('cari-pasangan', { pasangan: ['🐱'] })).toMatch(/pasangan/i);
    expect(validasiButir('cari-pasangan', { pasangan: ['🐱', '🐶'] })).toBe('');
  });

  describe('hitung: operasi +, −, ×, ÷', () => {
    const legenda = [
      { simbol: '🍎', nilai: 6 },
      { simbol: '🍌', nilai: 3 },
      { simbol: '🍇', nilai: 0 },
      { simbol: '🍒', nilai: 4 },
    ];
    const b = (soal: unknown[]) => ({ legenda, soal });

    it('menerima perkalian (x) & pembagian (:) yang valid', () => {
      expect(validasiButir('hitung', b([{ kiri: '🍎', kanan: '🍌', operasi: 'x' }]))).toBe('');
      expect(validasiButir('hitung', b([{ kiri: '🍎', kanan: '🍌', operasi: ':' }]))).toBe(''); // 6 ÷ 3
    });
    it('menolak operasi tak dikenal', () => {
      expect(validasiButir('hitung', b([{ kiri: '🍎', kanan: '🍌', operasi: '%' }]))).toMatch(/operasi/i);
    });
    it('pembagian: kanan tidak boleh 0', () => {
      expect(validasiButir('hitung', b([{ kiri: '🍎', kanan: '🍇', operasi: ':' }]))).toMatch(/0/);
    });
    it('pembagian: kiri harus habis dibagi kanan', () => {
      expect(validasiButir('hitung', b([{ kiri: '🍎', kanan: '🍒', operasi: ':' }]))).toMatch(/habis dibagi/i); // 6 ÷ 4
    });
    it('pengurangan: kiri harus ≥ kanan (aturan lama tetap)', () => {
      expect(validasiButir('hitung', b([{ kiri: '🍌', kanan: '🍎', operasi: '-' }]))).toMatch(/kiri/i);
    });
  });
});
