// src/lib/domain/gamifikasi.ts — logika murni gamifikasi (streak, lencana, tantangan)

/** Tanggal kalender WIB (YYYY-MM-DD) dari sebuah waktu (default sekarang). */
export function tanggalWIB(d: Date = new Date()): string {
  const wib = new Date(d.getTime() + 7 * 3600 * 1000); // geser ke WIB lalu ambil tanggal UTC-nya
  return wib.toISOString().slice(0, 10);
}

/** Nomor hari sederhana (stabil) dari string tanggal, untuk memilih tantangan harian. */
function nomorHari(tglStr: string): number {
  const [y, m, d] = tglStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// ===== Lencana =====
export interface LencanaDef { kode: string; judul: string; emoji: string; syarat: string; }

export const LENCANA: LencanaDef[] = [
  { kode: 'pertama', judul: 'Langkah Pertama', emoji: '🌟', syarat: 'Selesaikan game pertama' },
  { kode: 'rajin', judul: 'Rajin Bermain', emoji: '🎯', syarat: 'Selesaikan 10 game' },
  { kode: 'juara', judul: 'Juara', emoji: '🏆', syarat: 'Selesaikan 50 game' },
  { kode: 'koin100', judul: 'Kolektor Koin', emoji: '💰', syarat: 'Kumpulkan 100 koin' },
  { kode: 'streak3', judul: 'Konsisten', emoji: '🔥', syarat: 'Main 3 hari berturut-turut' },
  { kode: 'streak7', judul: 'Tak Terhentikan', emoji: '🚀', syarat: 'Main 7 hari berturut-turut' },
  { kode: 'sempurna', judul: 'Sempurna', emoji: '⭐', syarat: 'Dapat 3 bintang di satu game' },
  { kode: 'penjelajah', judul: 'Penjelajah', emoji: '🧭', syarat: 'Coba 5 jenis game berbeda' },
];

export const lencanaByKode = (kode: string): LencanaDef | undefined => LENCANA.find((l) => l.kode === kode);

export interface StatLencana { totalSelesai: number; koin: number; streak: number; adaBintang3: boolean; jenisMesin: number; }

/** Daftar kode lencana yang syaratnya terpenuhi untuk statistik anak. */
export function evaluasiLencana(s: StatLencana): string[] {
  const out: string[] = [];
  if (s.totalSelesai >= 1) out.push('pertama');
  if (s.totalSelesai >= 10) out.push('rajin');
  if (s.totalSelesai >= 50) out.push('juara');
  if (s.koin >= 100) out.push('koin100');
  if (s.streak >= 3) out.push('streak3');
  if (s.streak >= 7) out.push('streak7');
  if (s.adaBintang3) out.push('sempurna');
  if (s.jenisMesin >= 5) out.push('penjelajah');
  return out;
}

// ===== Tantangan harian =====
export interface TantanganDef { kode: string; judul: string; emoji: string; target: number; tipe: 'main' | 'bintang3' | 'jenis'; }

export const TANTANGAN_POOL: TantanganDef[] = [
  { kode: 'main1', judul: 'Mainkan 1 game hari ini', emoji: '🎮', target: 1, tipe: 'main' },
  { kode: 'selesai3', judul: 'Selesaikan 3 game hari ini', emoji: '🏁', target: 3, tipe: 'main' },
  { kode: 'bintang3', judul: 'Dapat 3 bintang di satu game', emoji: '⭐', target: 1, tipe: 'bintang3' },
  { kode: 'jenisbaru', judul: 'Coba 2 jenis game berbeda hari ini', emoji: '🧭', target: 2, tipe: 'jenis' },
];

export const BONUS_TANTANGAN = 5;

export function tantanganHariIni(tglStr: string): TantanganDef {
  return TANTANGAN_POOL[nomorHari(tglStr) % TANTANGAN_POOL.length];
}

/** Progres tantangan dari sesi main HARI INI. */
export function progresTantangan(t: TantanganDef, rowsHariIni: { mesin: string; bintang: number }[]): number {
  if (t.tipe === 'bintang3') return rowsHariIni.filter((r) => r.bintang >= 3).length;
  if (t.tipe === 'jenis') return new Set(rowsHariIni.map((r) => r.mesin)).size;
  return rowsHariIni.length; // 'main'
}
