// src/lib/data/anggaran.ts — Anggaran (realisasi vs anggaran) & Forecast (Fase 2C)
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';

const ymOf = (iso: string) => (iso ?? '').slice(0, 7);
function bulanSebelum(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function bulanSetelah(ym: string, n: number): string { return bulanSebelum(ym, -n); }
function labelBulan(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}
const sum = (a: number, b: number) => a + b;

type Trx = { arah: 'masuk' | 'keluar'; kategori: string; jumlah: number; tanggal: string };

// ============ REALISASI vs ANGGARAN ============
export interface RealisasiRow { kategori: string; anggaran: number; realisasi: number; selisih: number; persenPakai: number | null; }
export interface AnggaranBulan { ym: string; rows: RealisasiRow[]; totalAnggaran: number; totalRealisasi: number; }

export async function getAnggaranBulan(ym: string): Promise<AnggaranBulan> {
  const kosong: AnggaranBulan = { ym, rows: [], totalAnggaran: 0, totalRealisasi: 0 };
  try {
    const s = await createClient();
    const [angRes, trxRes] = await Promise.all([
      s.from('anggaran').select('kategori,jumlah').eq('ym', ym),
      s.from('transaksi_keuangan').select('arah,kategori,jumlah,tanggal').eq('arah', 'keluar'),
    ]);
    const ang = (angRes.data ?? []) as { kategori: string; jumlah: number }[];
    const trx = ((trxRes.data ?? []) as Trx[]).filter((t) => ymOf(t.tanggal) === ym);

    const angMap = new Map<string, number>();
    for (const a of ang) angMap.set(a.kategori, (angMap.get(a.kategori) ?? 0) + a.jumlah);
    const realMap = new Map<string, number>();
    for (const t of trx) realMap.set(t.kategori, (realMap.get(t.kategori) ?? 0) + t.jumlah);

    const kategoris = new Set<string>([...angMap.keys(), ...realMap.keys()]);
    const rows: RealisasiRow[] = [...kategoris].map((kategori) => {
      const anggaran = angMap.get(kategori) ?? 0;
      const realisasi = realMap.get(kategori) ?? 0;
      return { kategori, anggaran, realisasi, selisih: anggaran - realisasi, persenPakai: anggaran > 0 ? Math.round((realisasi / anggaran) * 100) : null };
    }).sort((a, b) => b.realisasi - a.realisasi);

    return { ym, rows, totalAnggaran: [...angMap.values()].reduce(sum, 0), totalRealisasi: [...realMap.values()].reduce(sum, 0) };
  } catch { return kosong; }
}

// ============ FORECAST ============
export interface ForecastRow { ym: string; label: string; revenue: number; expense: number; net: number; saldoProyeksi: number; anggaranAda: boolean; }
export interface Forecast {
  saldoSekarang: number;
  basis: { avgRevenue: number; avgExpense: number };
  rows: ForecastRow[];
}

/** Proyeksi n bulan ke depan berbasis rata-rata 3 bulan terakhir; expense pakai anggaran bila bulan itu punya anggaran. */
export async function getForecast(n = 6): Promise<Forecast> {
  const kosong: Forecast = { saldoSekarang: 0, basis: { avgRevenue: 0, avgExpense: 0 }, rows: [] };
  try {
    const s = await createClient();
    const bulanIni = tanggalWIB().slice(0, 7);
    const [trxRes, angRes] = await Promise.all([
      s.from('transaksi_keuangan').select('arah,kategori,jumlah,tanggal'),
      s.from('anggaran').select('ym,jumlah'),
    ]);
    const trx = (trxRes.data ?? []) as Trx[];
    const ang = (angRes.data ?? []) as { ym: string; jumlah: number }[];

    const masuk = trx.filter((t) => t.arah === 'masuk');
    const keluar = trx.filter((t) => t.arah === 'keluar');
    const inBulan = (arr: Trx[], ym: string) => arr.filter((t) => ymOf(t.tanggal) === ym).map((t) => t.jumlah).reduce(sum, 0);

    // rata-rata 3 bulan penuh sebelum bulan ini (basis tren)
    let sr = 0, se = 0;
    for (let i = 1; i <= 3; i++) { const ym = bulanSebelum(bulanIni, i); sr += inBulan(masuk, ym); se += inBulan(keluar, ym); }
    const avgRevenue = Math.round(sr / 3);
    const avgExpense = Math.round(se / 3);

    const saldoSekarang = masuk.map((t) => t.jumlah).reduce(sum, 0) - keluar.map((t) => t.jumlah).reduce(sum, 0);

    // total anggaran per bulan (bila diisi, dipakai menggantikan avgExpense)
    const angBulan = new Map<string, number>();
    for (const a of ang) angBulan.set(a.ym, (angBulan.get(a.ym) ?? 0) + a.jumlah);

    const rows: ForecastRow[] = [];
    let saldo = saldoSekarang;
    for (let i = 1; i <= n; i++) {
      const ym = bulanSetelah(bulanIni, i);
      const anggaranAda = angBulan.has(ym);
      const revenue = avgRevenue;
      const expense = anggaranAda ? (angBulan.get(ym) ?? 0) : avgExpense;
      const net = revenue - expense;
      saldo += net;
      rows.push({ ym, label: labelBulan(ym), revenue, expense, net, saldoProyeksi: saldo, anggaranAda });
    }
    return { saldoSekarang, basis: { avgRevenue, avgExpense }, rows };
  } catch { return kosong; }
}
