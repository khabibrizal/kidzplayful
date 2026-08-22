// src/lib/__tests__/nav.test.ts
import { describe, it, expect } from 'vitest';
import { pathInternal } from '../nav';

describe('pathInternal', () => {
  it('menerima path internal apa adanya', () => {
    expect(pathInternal('/kelas/abc')).toBe('/kelas/abc');
    expect(pathInternal('/ortu/1?anak=2')).toBe('/ortu/1?anak=2');
    expect(pathInternal('  /kelas/abc  ')).toBe('/kelas/abc');
  });

  it('menolak URL luar & protokol aneh — parameter tujuan yang bebas = open redirect', () => {
    for (const jahat of [
      'https://luar.example',
      'http://luar.example/x',
      '//luar.example',            // protocol-relative: browser membacanya sebagai host lain
      'javascript:alert(1)',
      'data:text/html,<script>',
      'kelas/abc',                 // relatif tanpa '/' — bisa jadi apa saja tergantung basis
      '',
      '   ',
    ]) {
      expect(pathInternal(jahat)).toBeNull();
    }
  });

  it('null/undefined aman', () => {
    expect(pathInternal(null)).toBeNull();
    expect(pathInternal(undefined)).toBeNull();
  });

  it('backslash tak boleh lolos — sebagian browser memperlakukan \\\\ seperti //', () => {
    expect(pathInternal('/\\luar.example')).toBeNull();
    expect(pathInternal('\\\\luar.example')).toBeNull();
  });
});
