// src/lib/domain/saring.ts — pencarian teks & penyaringan rentang tanggal (murni, tanpa I/O).
//
// Dipakai bersama oleh daftar yang bisa dicari & disaring tanggalnya. Ditaruh di satu tempat
// karena dua kekeliruan di bawah ini mudah terulang di tiap halaman baru, dan keduanya
// TERBACA SEBAGAI DATA HILANG — bukan sebagai filter yang salah:
//
//   1. batas akhir yang EKSKLUSIF → catatan yang diisi pada tanggal `sampai` lenyap;
//   2. membandingkan cap waktu UTC dengan tanggal yang dipilih pengguna → catatan yang
//      diisi antara 00:00–07:00 WIB terhitung di tanggal KEMARIN.

/** Normalisasi kata kunci: rapikan spasi & huruf agar pencarian tak peka besar-kecil. */
export function rapikanKunci(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Apakah `teks` mengandung kata kunci `q`?
 * Kata kunci KOSONG selalu cocok — filter yang tak diisi tidak menyaring apa pun.
 */
export function cocokCari(teks: string | null | undefined, q: string | null | undefined): boolean {
  const kunci = rapikanKunci(q);
  if (!kunci) return true;
  return rapikanKunci(teks).includes(kunci);
}

const OFFSET_WIB = 7 * 60 * 60 * 1000;

/**
 * Tanggal WIB (`YYYY-MM-DD`) dari sebuah cap waktu ISO.
 *
 * Kenapa bukan `iso.slice(0, 10)`: potongan itu memberi tanggal **UTC**. Catatan yang diisi
 * pukul 01:00 WIB tanggal 24 tersimpan sebagai `…T18:00:00Z` tanggal 23, sehingga akan
 * ditampilkan DAN disaring sebagai tanggal 23 — dan orang tua yang mencarinya di tanggal 24
 * akan menyimpulkan catatannya hilang.
 *
 * Nilai tak terbaca → string kosong, yang oleh `dalamRentang` diperlakukan sebagai
 * "tak diketahui" dan TIDAK ikut disaring keluar (lihat alasannya di sana).
 */
export function tanggalWibDariISO(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t + OFFSET_WIB).toISOString().slice(0, 10);
}

/**
 * Apakah `tanggal` (`YYYY-MM-DD`) berada di dalam rentang `dari`..`sampai`?
 *
 * • Kedua ujung **INKLUSIF**. Batas akhir yang eksklusif akan membuang catatan yang diisi
 *   pada hari terakhir rentang — kekeliruan yang tak terlihat sampai seseorang mencari
 *   catatan hari ini dan tak menemukannya.
 * • Batas KOSONG = tak dibatasi di sisi itu, jadi mengisi salah satu saja tetap berguna.
 * • Batas TERBALIK (`dari` > `sampai`) ditukar, bukan dijadikan "tak ada hasil": pada
 *   sepasang kotak tanggal, itu hampir selalu salah taruh. UI menuliskan rentang yang
 *   BENAR-BENAR dipakai, jadi penukarannya terlihat, bukan disembunyikan.
 * • Tanggal KOSONG (cap waktunya tak terbaca) dianggap lolos — menyaring keluar baris yang
 *   tanggalnya tak diketahui berarti menyembunyikan data yang justru perlu diperiksa.
 */
export function dalamRentang(
  tanggal: string | null | undefined,
  dari?: string | null,
  sampai?: string | null,
): boolean {
  const t = (tanggal ?? '').trim();
  if (!t) return true;
  let a = (dari ?? '').trim();
  let b = (sampai ?? '').trim();
  if (a && b && a > b) [a, b] = [b, a];
  if (a && t < a) return false;
  if (b && t > b) return false;
  return true;
}

/** Rentang yang benar-benar dipakai — untuk ditulis di layar apa adanya. */
export function rentangTerpakai(
  dari?: string | null,
  sampai?: string | null,
): { dari: string; sampai: string; aktif: boolean; ditukar: boolean } {
  let a = (dari ?? '').trim();
  let b = (sampai ?? '').trim();
  const ditukar = !!a && !!b && a > b;
  if (ditukar) [a, b] = [b, a];
  return { dari: a, sampai: b, aktif: !!a || !!b, ditukar };
}

/** Bentuk event seperlunya untuk penyaringan tanggal. */
export interface EventTanggal {
  tanggal?: string | null;
  baby_tanggal?: string | null;
  toddler_tanggal?: string | null;
}

/**
 * SEMUA tanggal yang dimiliki sebuah event, tanpa duplikat.
 *
 * Sebuah event bisa punya tanggal gabungan (`tanggal`) DAN/ATAU tanggal per kelas
 * (`baby_tanggal`, `toddler_tanggal`, migrasi 0069). Menyaring hanya pada `tanggal` akan
 * menghilangkan event yang tanggalnya cuma diisi di kelasnya — dan admin akan menyimpulkan
 * event-nya terhapus.
 */
export function tanggalEvent(ev: EventTanggal | null | undefined): string[] {
  const semua = [ev?.tanggal, ev?.baby_tanggal, ev?.toddler_tanggal]
    .map((x) => (x ?? '').trim())
    .filter(Boolean);
  return [...new Set(semua)].sort();
}

/**
 * Apakah event ini punya SETIDAKNYA SATU tanggal di dalam rentang?
 *
 * Event tanpa tanggal sama sekali dianggap LOLOS — mengikuti aturan yang sama dengan
 * `dalamRentang`: baris yang tanggalnya tak diketahui justru yang perlu diperiksa, dan
 * menyaringnya keluar hanya membuatnya tak pernah ketemu.
 */
export function eventDalamRentang(
  ev: EventTanggal | null | undefined,
  dari?: string | null,
  sampai?: string | null,
): boolean {
  if (!rentangTerpakai(dari, sampai).aktif) return true;
  const tgl = tanggalEvent(ev);
  if (tgl.length === 0) return true;
  return tgl.some((x) => dalamRentang(x, dari, sampai));
}
