// src/lib/__tests__/ref.test.ts
import { describe, it, expect } from 'vitest';
import { parseRef } from '../ref';

describe('parseRef', () => {
  const now = 1_000_000_000_000;
  it('null bila kosong', () => { expect(parseRef(null, now)).toBeNull(); });
  it('null bila JSON rusak', () => { expect(parseRef('{bukan json', now)).toBeNull(); });
  it('null bila kedaluwarsa (>30 hari)', () => {
    const raw = JSON.stringify({ saluran: 'whatsapp', jenis: 'kelas', ts: now - 31 * 864e5 });
    expect(parseRef(raw, now)).toBeNull();
  });
  it('baca valid (<30 hari)', () => {
    const raw = JSON.stringify({ saluran: 'whatsapp', jenis: 'kelas', ts: now - 5 * 864e5 });
    expect(parseRef(raw, now)).toEqual({ saluran: 'whatsapp', jenis: 'kelas' });
  });
  it('default saluran native bila kosong', () => {
    const raw = JSON.stringify({ jenis: 'game', ts: now });
    expect(parseRef(raw, now)).toEqual({ saluran: 'native', jenis: 'game' });
  });
});
