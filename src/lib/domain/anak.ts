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

/** Total umur dalam bulan (untuk anak 0-6 th). */
export function umurBulanTotal(tanggalLahir: Date, sekarang: Date): number {
  let m = (sekarang.getUTCFullYear() - tanggalLahir.getUTCFullYear()) * 12
    + (sekarang.getUTCMonth() - tanggalLahir.getUTCMonth());
  if (sekarang.getUTCDate() < tanggalLahir.getUTCDate()) m--;
  return Math.max(0, m);
}

/** Umur ringkas: "2 thn 3 bln" / "8 bln" / "3 thn". */
/**
 * Umur dengan kata PENUH: "3 tahun 11 bulan".
 *
 * Terpisah dari `umurTeks` yang menyingkat ("3 thn 11 bln"). Singkatan itu tepat untuk kartu
 * dan daftar yang sempit; rapor bulanan dibaca orang tua sebagai dokumen, dan di sana
 * singkatan terbaca seperti data mentah aplikasi, bukan kalimat tentang anaknya.
 */
export function umurTeksPanjang(tanggalLahir: Date, sekarang: Date): string {
  const m = umurBulanTotal(tanggalLahir, sekarang);
  if (!Number.isFinite(m) || m < 0) return '';
  const th = Math.floor(m / 12), bl = m % 12;
  if (th <= 0) return `${bl} bulan`;
  return bl > 0 ? `${th} tahun ${bl} bulan` : `${th} tahun`;
}

export function umurTeks(tanggalLahir: Date, sekarang: Date): string {
  const m = umurBulanTotal(tanggalLahir, sekarang);
  const th = Math.floor(m / 12), bl = m % 12;
  if (th <= 0) return `${bl} bln`;
  return bl > 0 ? `${th} thn ${bl} bln` : `${th} thn`;
}
