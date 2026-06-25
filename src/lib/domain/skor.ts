// src/lib/domain/skor.ts
export function hitungBintang(benar: number, total: number): number {
  if (total <= 0) return 1;
  const r = benar / total;
  if (r >= 0.99) return 3;
  if (r >= 0.6) return 2;
  return 1;
}
