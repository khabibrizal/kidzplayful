// src/lib/domain/usia.ts
export function cocokUsia(umur: number, min: number, max: number): boolean {
  return umur >= min && umur <= max;
}
