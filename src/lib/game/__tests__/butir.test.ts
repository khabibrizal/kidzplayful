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

  it('ingatan (memory) butuh 2–8 kartu', () => {
    expect(validasiButir('ingatan', { pasangan: ['🍎'] })).toMatch(/minimal 2/i);
    expect(validasiButir('ingatan', { pasangan: ['🍎', '🍌', '🍇'] })).toBe('');
    expect(validasiButir('ingatan', { pasangan: Array.from({ length: 9 }, (_, i) => `x${i}`) })).toMatch(/maksimal 8/i);
    expect(butirDariForm('ingatan', { pasangan: ['🍎', '🍌'] })).toEqual({ pasangan: ['🍎', '🍌'] });
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

  describe('calistung: sukukata', () => {
    it('menerima soal susun & dengar yang valid', () => {
      expect(validasiButir('sukukata', { soal: [{ kata: 'buku', sukuKata: ['bu', 'ku'], pengecoh: ['ka'], mode: 'susun' }] })).toBe('');
      expect(validasiButir('sukukata', { soal: [{ kata: 'ma', sukuKata: ['ma'], pengecoh: ['na', 'mi'], mode: 'dengar' }] })).toBe('');
    });
    it('menolak gabungan suku kata ≠ kata', () => {
      expect(validasiButir('sukukata', { soal: [{ kata: 'buku', sukuKata: ['bu', 'ka'], pengecoh: [], mode: 'susun' }] })).toMatch(/tidak sama/i);
    });
    it('mode susun butuh ≥2 suku kata; dengar butuh pengecoh', () => {
      expect(validasiButir('sukukata', { soal: [{ kata: 'ma', sukuKata: ['ma'], pengecoh: ['na'], mode: 'susun' }] })).toMatch(/2 suku kata/i);
      expect(validasiButir('sukukata', { soal: [{ kata: 'ma', sukuKata: ['ma'], pengecoh: [], mode: 'dengar' }] })).toMatch(/pengecoh/i);
    });
  });

  describe('calistung: jiplak', () => {
    it('menerima karakter yang tersedia (huruf & angka)', () => {
      expect(validasiButir('jiplak', { soal: [{ karakter: 'A' }, { karakter: 'b' }, { karakter: '3' }] })).toBe('');
    });
    it('menolak karakter di luar jalur', () => {
      expect(validasiButir('jiplak', { soal: [{ karakter: '?' }] })).toMatch(/belum tersedia/i);
      expect(validasiButir('jiplak', { soal: [] })).toMatch(/minimal/i);
    });
  });

  describe('calistung: hitung-benda', () => {
    it('menerima mode hitung & banyak-mana yang valid', () => {
      expect(validasiButir('hitung-benda', { soal: [{ benda: '🍎', jumlah: 7, mode: 'hitung' }] })).toBe('');
      expect(validasiButir('hitung-benda', { soal: [{ benda: '🍎', jumlah: 3, benda2: '🍌', jumlah2: 5, mode: 'banyak-mana' }] })).toBe('');
    });
    it('jumlah harus 1–10', () => {
      expect(validasiButir('hitung-benda', { soal: [{ benda: '🍎', jumlah: 0, mode: 'hitung' }] })).toMatch(/1–10/);
      expect(validasiButir('hitung-benda', { soal: [{ benda: '🍎', jumlah: 11, mode: 'hitung' }] })).toMatch(/1–10/);
    });
    it('banyak-mana wajib kelompok kedua & jumlah beda', () => {
      expect(validasiButir('hitung-benda', { soal: [{ benda: '🍎', jumlah: 3, mode: 'banyak-mana' }] })).toMatch(/kedua/i);
      expect(validasiButir('hitung-benda', { soal: [{ benda: '🍎', jumlah: 3, benda2: '🍌', jumlah2: 3, mode: 'banyak-mana' }] })).toMatch(/sama/i);
    });
  });
});
