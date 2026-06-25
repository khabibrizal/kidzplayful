// src/lib/domain/anak.ts
export type Mode = 'ortu' | 'anak';

export function umurTahun(tanggalLahir: Date, sekarang: Date): number {
  let umur = sekarang.getUTCFullYear() - tanggalLahir.getUTCFullYear();
  const belumUlangTahun =
    sekarang.getUTCMonth() < tanggalLahir.getUTCMonth() ||
    (sekarang.getUTCMonth() === tanggalLahir.getUTCMonth() &&
      sekarang.getUTCDate() < tanggalLahir.getUTCDate());
  if (belumUlangTahun) umur--;
  return umur;
}

export function modeDefault(umur: number): Mode {
  return umur < 2 ? 'ortu' : 'anak';
}
