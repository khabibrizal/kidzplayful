// src/lib/domain/paginasi.ts — cari + paginasi satu daftar (murni, tanpa I/O).
//
// ATURAN YANG PALING MUDAH SALAH: **saring dulu, baru potong halaman.** Kalau dibalik —
// memotong halaman lalu menyaring isi halaman itu — hasil pencarian akan bergantung pada
// halaman yang sedang dibuka, dan judul yang ada di halaman 3 tak akan pernah muncul saat
// dicari dari halaman 1. Itu terbaca sebagai "datanya tidak ada".
//
// Normalisasi & pencocokan kata kunci dipakai BERSAMA dengan penyaring lain (`saring.ts`).
// Dua salinan aturan "cocok" berarti dua halaman bisa menjawab beda untuk kunci yang sama.
import { rapikanKunci as rapikan, cocokCari } from './saring';

export interface HasilPaginasi<T> {
  /** isi halaman yang sedang dibuka */
  baris: T[];
  /** jumlah item SESUDAH disaring (bukan jumlah seluruh data) */
  total: number;
  /** halaman yang benar-benar dipakai, sudah dijepit ke rentang yang ada */
  hal: number;
  totalHal: number;
  /** true bila kata kunci sedang aktif — dipakai UI untuk pesan "tak ada hasil" */
  adaFilter: boolean;
}

export const PER_HAL_ANAK = 10;


/**
 * @param items    seluruh data (belum dipotong)
 * @param judulDari cara mengambil judul yang dicari dari sebuah item
 * @param q        kata kunci; kosong = tanpa penyaringan
 * @param hal      halaman diminta (1-based); di luar rentang akan dijepit
 */
export function saringPaginasi<T>(
  items: T[] | null | undefined,
  judulDari: (item: T) => string,
  { q = '', hal = 1, perHal = PER_HAL_ANAK }: { q?: string; hal?: number; perHal?: number } = {},
): HasilPaginasi<T> {
  const semua = items ?? [];
  const kunci = rapikan(q);
  const adaFilter = kunci.length > 0;

  // SARING DULU — atas seluruh data, bukan atas isi satu halaman.
  const tersaring = adaFilter
    ? semua.filter((it) => cocokCari(judulDari(it), kunci))
    : semua;

  const total = tersaring.length;
  const perH = Math.max(1, Math.floor(perHal));
  const totalHal = Math.max(1, Math.ceil(total / perH));
  // Halaman dijepit: sesudah menyaring, halaman 5 bisa jadi tak ada lagi — dan menampilkan
  // halaman kosong membuat pengguna mengira hasilnya nol.
  const halPakai = Math.min(Math.max(1, Math.floor(hal) || 1), totalHal);
  const awal = (halPakai - 1) * perH;

  return { baris: tersaring.slice(awal, awal + perH), total, hal: halPakai, totalHal, adaFilter };
}
