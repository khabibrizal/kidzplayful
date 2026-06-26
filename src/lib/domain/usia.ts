// src/lib/domain/usia.ts
export function cocokUsia(umur: number, min: number, max: number): boolean {
  return umur >= min && umur <= max;
}

export type KategoriUsia = 'baby' | 'toddler';
export function kategoriUsia(umur: number): KategoriUsia {
  return umur < 2 ? 'baby' : 'toddler';
}
