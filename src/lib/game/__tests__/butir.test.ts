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
});
