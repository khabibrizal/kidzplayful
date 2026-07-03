// src/lib/domain/laporan-anak.ts
export interface BarisHasil { mesin?: string; area_skill: string; bintang: number; durasi_detik: number; selesai: boolean; }
export interface StatMesin { count: number; tercepat: number; }
export interface LaporanAnak { totalSesi: number; totalBintang: number; totalMenit: number; totalDetik: number; rataDetik: number; tercepatDetik: number; perArea: Record<string, number>; perMesin: Record<string, StatMesin>; }

export function laporanAnak(rows: BarisHasil[]): LaporanAnak {
  const r: LaporanAnak = { totalSesi: rows.length, totalBintang: 0, totalMenit: 0, totalDetik: 0, rataDetik: 0, tercepatDetik: 0, perArea: {}, perMesin: {} };
  let detik = 0;
  let tercepat = Infinity;
  for (const x of rows) {
    r.totalBintang += x.bintang || 0;
    const d = x.durasi_detik || 0;
    detik += d;
    if (d > 0) tercepat = Math.min(tercepat, d);
    r.perArea[x.area_skill] = (r.perArea[x.area_skill] ?? 0) + 1;
    const m = x.mesin;
    if (m) {
      const pm = r.perMesin[m] ?? { count: 0, tercepat: 0 };
      pm.count += 1;
      if (d > 0) pm.tercepat = pm.tercepat === 0 ? d : Math.min(pm.tercepat, d);
      r.perMesin[m] = pm;
    }
  }
  r.totalDetik = detik;
  r.totalMenit = Math.round(detik / 60);
  r.rataDetik = rows.length ? Math.round(detik / rows.length) : 0;
  r.tercepatDetik = Number.isFinite(tercepat) ? tercepat : 0;
  return r;
}
