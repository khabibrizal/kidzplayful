// src/lib/domain/laporan-anak.ts
export interface BarisHasil { area_skill: string; bintang: number; durasi_detik: number; selesai: boolean; }
export interface LaporanAnak { totalSesi: number; totalBintang: number; totalMenit: number; perArea: Record<string, number>; }

export function laporanAnak(rows: BarisHasil[]): LaporanAnak {
  const r: LaporanAnak = { totalSesi: rows.length, totalBintang: 0, totalMenit: 0, perArea: {} };
  let detik = 0;
  for (const x of rows) {
    r.totalBintang += x.bintang || 0;
    detik += x.durasi_detik || 0;
    r.perArea[x.area_skill] = (r.perArea[x.area_skill] ?? 0) + 1;
  }
  r.totalMenit = Math.round(detik / 60);
  return r;
}
