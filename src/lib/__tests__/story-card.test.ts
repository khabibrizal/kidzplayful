// src/lib/__tests__/story-card.test.ts
import { describe, it, expect } from 'vitest';
import { bungkusTeks } from '../story-card';

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
