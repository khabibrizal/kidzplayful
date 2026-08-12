// src/lib/domain/stiker.ts — aturan tata letak stiker nama (murni, tanpa React) agar bisa diuji.

// Tangga ukuran nama: [pt, perkiraan maksimum karakter per baris pada lebar cetak 80mm].
// Angka kapasitasnya dikalibrasi dari render nyata (huruf tebal), bukan rumus lebar rata-rata.
const TANGGA: [number, number][] = [[34, 11], [28, 13], [23, 16], [19, 20]];

/**
 * Ukuran font nama panggilan di stiker (pt). Nama pendek — mayoritas — dapat ukuran
 * TERBESAR; nama panjang mengecil sampai muat.
 *
 * Dua syarat, keduanya berasal dari bukti render pada stiker 90×60mm:
 *  (a) kata TERPANJANG harus muat satu baris — kalau tidak, `overflow-wrap:anywhere`
 *      memenggal kata di tengah ("Puspaningru | m");
 *  (b) seluruh nama maksimum 2 baris — baris ke-3 mendorong isi melewati tinggi stiker
 *      lalu terpotong oleh `overflow:hidden`.
 */
export function ukuranNama(nama: string): number {
  const t = nama.trim();
  const kataTerpanjang = Math.max(0, ...t.split(/\s+/).map((k) => k.length));
  for (const [pt, kapasitas] of TANGGA) {
    if (kataTerpanjang <= kapasitas && Math.ceil(t.length / kapasitas) <= 2) return pt;
  }
  return TANGGA[TANGGA.length - 1][0];
}
