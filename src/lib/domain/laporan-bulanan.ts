// src/lib/domain/laporan-bulanan.ts — agregasi rapor bulanan (murni, tanpa I/O).
//
// Semua batas waktu memakai **WIB**: rapor "Agustus" harus berisi kegiatan tanggal 1–31
// menurut jam Indonesia, bukan UTC — kalau tidak, kegiatan malam tanggal 31 pindah ke bulan
// berikutnya dan orang tua akan mengira catatannya hilang.

const MENIT = 60 * 1000;
const OFFSET_WIB = 7 * 60 * MENIT;

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Pecah 'YYYY-MM' menjadi angka; tak sah → bulan berjalan. */
function pecah(ym: string, sekarang = new Date()): { tahun: number; bulan: number } {
  const m = /^(\d{4})-(\d{2})$/.exec((ym ?? '').trim());
  if (!m) {
    const wib = new Date(sekarang.getTime() + OFFSET_WIB);
    return { tahun: wib.getUTCFullYear(), bulan: wib.getUTCMonth() + 1 };
  }
  const bulan = Math.min(12, Math.max(1, Number(m[2])));
  return { tahun: Number(m[1]), bulan };
}

/** Batas awal & akhir sebuah bulan WIB, sebagai ISO string untuk query. */
export function rentangBulan(ym: string, sekarang = new Date()): { dari: string; sampai: string } {
  const { tahun, bulan } = pecah(ym, sekarang);
  const awalWib = Date.UTC(tahun, bulan - 1, 1);
  const akhirWib = Date.UTC(bulan === 12 ? tahun + 1 : tahun, bulan === 12 ? 0 : bulan, 1);
  return {
    dari: new Date(awalWib - OFFSET_WIB).toISOString(),
    sampai: new Date(akhirWib - OFFSET_WIB).toISOString(),
  };
}

export function labelBulan(ym: string, sekarang = new Date()): string {
  const { tahun, bulan } = pecah(ym, sekarang);
  return `${NAMA_BULAN[bulan - 1]} ${tahun}`;
}

/** N bulan terakhir (terbaru dulu) dalam format 'YYYY-MM', menurut WIB. */
export function bulanTerakhir(sekarang: Date, n: number): string[] {
  const wib = new Date(sekarang.getTime() + OFFSET_WIB);
  const out: string[] = [];
  let t = wib.getUTCFullYear();
  let b = wib.getUTCMonth() + 1;
  for (let i = 0; i < Math.max(1, n); i++) {
    out.push(`${t}-${String(b).padStart(2, '0')}`);
    b -= 1;
    if (b === 0) { b = 12; t -= 1; }
  }
  return out;
}

export interface KegiatanRingkas { jenis: 'ide-bermain' | 'video'; judul: string | null; waktu: string }
export interface HasilMainRingkas { area_skill: string | null; bintang: number | null; durasi_detik: number | null; selesai: boolean | null }
export interface CatatanRingkas { judulEvent: string; dinilai_oleh: string | null }

export interface RingkasanBulan {
  totalKegiatan: number;
  ideBermain: number;
  video: number;
  daftarIdeBermain: { judul: string; jumlah: number }[];
  daftarVideo: { judul: string; jumlah: number }[];
  totalSesi: number;
  totalBintang: number;
  totalMenit: number;
  perArea: Record<string, number>;
  areaTerbanyak: string | null;
  catatanGuru: CatatanRingkas[];
  event: string[];
  rekomendasi: number;
  /** true bila bulan itu punya sesuatu untuk ditampilkan */
  adaIsi: boolean;
}

function kelompok(items: KegiatanRingkas[]): { judul: string; jumlah: number }[] {
  const m = new Map<string, number>();
  for (const k of items) {
    const j = (k.judul ?? '').trim() || 'Tanpa judul';
    m.set(j, (m.get(j) ?? 0) + 1);
  }
  return [...m.entries()].map(([judul, jumlah]) => ({ judul, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.judul.localeCompare(b.judul));
}

export function ringkasBulan(input: {
  kegiatan: KegiatanRingkas[];
  hasilMain: HasilMainRingkas[];
  catatan: CatatanRingkas[];
  event: string[];
  rekomendasi: number;
}): RingkasanBulan {
  const keg = input.kegiatan ?? [];
  const ide = keg.filter((k) => k.jenis === 'ide-bermain');
  const vid = keg.filter((k) => k.jenis === 'video');

  const main = input.hasilMain ?? [];
  const perArea: Record<string, number> = {};
  let bintang = 0;
  let detik = 0;
  for (const h of main) {
    const area = (h.area_skill ?? '').trim();
    if (area) perArea[area] = (perArea[area] ?? 0) + 1;
    bintang += Math.max(0, Math.floor(Number(h.bintang) || 0));
    detik += Math.max(0, Math.floor(Number(h.durasi_detik) || 0));
  }
  const areaTerbanyak = Object.entries(perArea)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

  return {
    totalKegiatan: keg.length,
    ideBermain: ide.length,
    video: vid.length,
    daftarIdeBermain: kelompok(ide),
    daftarVideo: kelompok(vid),
    totalSesi: main.length,
    totalBintang: bintang,
    totalMenit: Math.round(detik / 60),
    perArea,
    areaTerbanyak,
    catatanGuru: input.catatan ?? [],
    event: input.event ?? [],
    rekomendasi: Math.max(0, Math.floor(input.rekomendasi || 0)),
    adaIsi: keg.length > 0 || main.length > 0 || (input.catatan ?? []).length > 0 || (input.event ?? []).length > 0,
  };
}
