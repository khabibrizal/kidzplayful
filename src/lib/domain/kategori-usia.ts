// src/lib/domain/kategori-usia.ts — pemeriksaan master Kategori Usia (murni, tanpa I/O).
//
// KENAPA ADA: kategori usia menentukan tema mana yang terbuka untuk seorang anak
// (`bracketUntukUmur` di `siklus-kurikulum.ts`). Dua keadaan di master ini membuat seorang
// anak yang sudah berlangganan TIDAK MELIHAT SATU TEMA PUN, dan keduanya tak terlihat dari
// daftar biasa:
//
//   1. RENTANG BERTUMPUK — satu tahun diklaim dua kategori. Sistem harus memilih salah satu,
//      dan pilihannya bisa berbeda dari dugaan admin. Persis ini yang terjadi pada anak
//      berusia 6 th: "Early Childhood (5-6)" dan "Middle Childhood (6-9)" sama-sama memuat
//      usia 6, anak jatuh ke Early Childhood, sedangkan temanya ditaruh di Middle Childhood.
//   2. KATEGORI TANPA TEMA — anak yang jatuh ke situ tak punya materi sama sekali.
//
// Keduanya kekeliruan ISI/KONFIGURASI, bukan bug kode. Yang bisa dilakukan kode adalah
// MEMPERLIHATKANNYA sejak di halaman admin, bukan menunggu orang tua mengeluh.
import { bracketUntukUmur, type BracketUsia } from './siklus-kurikulum';

export interface KategoriPeriksa extends BracketUsia { nama: string }

export interface Tumpukan {
  a: KategoriPeriksa;
  b: KategoriPeriksa;
  /** tahun-tahun yang diklaim keduanya */
  usia: number[];
  /** kategori yang BENAR-BENAR dipilih sistem untuk tahun-tahun itu */
  menang: string;
}

/**
 * Pasangan kategori yang rentangnya bertumpuk, beserta kategori mana yang akhirnya dipakai.
 *
 * "Mana yang menang" ikut dilaporkan karena itulah yang sebenarnya menentukan nasib anak —
 * daftar tumpang tindih tanpa menyebut pemenangnya masih menyisakan tebak-tebakan.
 */
export function tumpukanKategori(list: KategoriPeriksa[] | null | undefined): Tumpukan[] {
  const k = (list ?? []).filter((x) => Number.isFinite(Number(x.usia_min)) && Number.isFinite(Number(x.usia_max)));
  const out: Tumpukan[] = [];
  for (let i = 0; i < k.length; i++) {
    for (let j = i + 1; j < k.length; j++) {
      const a = k[i], b = k[j];
      const dari = Math.max(Number(a.usia_min), Number(b.usia_min));
      const sampai = Math.min(Number(a.usia_max), Number(b.usia_max));
      if (dari > sampai) continue;
      const usia: number[] = [];
      for (let u = dari; u <= sampai; u++) usia.push(u);
      const idMenang = bracketUntukUmur(k, dari);
      out.push({ a, b, usia, menang: k.find((x) => x.id === idMenang)?.nama ?? '—' });
    }
  }
  return out;
}

/**
 * Peta umur → kategori yang benar-benar dipakai sistem, untuk umur 0..`maks`.
 *
 * Ditampilkan apa adanya di admin: satu-satunya cara memastikan seorang anak berumur N akan
 * mendarat di kategori yang dimaksud admin adalah dengan MELIHATNYA, bukan menyimpulkannya
 * dari rentang yang tertulis.
 */
export function petaUmurKategori(
  list: KategoriPeriksa[] | null | undefined,
  maks = 12,
): { usia: number; nama: string | null; jumlahCocok: number }[] {
  const k = list ?? [];
  const out: { usia: number; nama: string | null; jumlahCocok: number }[] = [];
  for (let u = 0; u <= Math.max(0, Math.floor(maks)); u++) {
    const cocok = k.filter((x) => u >= Number(x.usia_min) && u <= Number(x.usia_max));
    const id = bracketUntukUmur(k, u);
    out.push({
      usia: u,
      nama: k.find((x) => x.id === id)?.nama ?? null,
      jumlahCocok: cocok.length,
    });
  }
  return out;
}

/**
 * Kategori yang TIDAK punya satu pun tema aktif.
 *
 * Hanya kategori yang benar-benar bisa "kejatuhan" anak yang berbahaya, tapi daftarnya
 * sengaja tidak disaring: kategori kosong yang belum terpakai pun tetap perlu diisi sebelum
 * ada anak yang masuk ke sana.
 */
export function kategoriTanpaTema(
  list: KategoriPeriksa[] | null | undefined,
  tema: { kategori_usia_id?: string | null }[] | null | undefined,
): KategoriPeriksa[] {
  const dipakai = new Set((tema ?? []).map((t) => t.kategori_usia_id ?? '').filter(Boolean));
  return (list ?? []).filter((k) => !dipakai.has(k.id));
}
