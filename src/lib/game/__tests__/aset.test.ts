// src/lib/game/__tests__/aset.test.ts
import { describe, it, expect } from 'vitest';
import { isUrlAset } from '../aset';

describe('isUrlAset', () => {
  it('true utk url http & path', () => {
    expect(isUrlAset('https://x.supabase.co/storage/v1/object/public/aset/a.png')).toBe(true);
    expect(isUrlAset('/aset/a.png')).toBe(true);
  });
  it('false utk emoji/teks', () => {
    expect(isUrlAset('🐱')).toBe(false);
    expect(isUrlAset('kucing')).toBe(false);
  });
});
