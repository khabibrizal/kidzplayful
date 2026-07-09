// src/lib/data/keuangan.ts — baca & agregasi data keuangan (admin/investor)
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { statusLangganan } from '@/lib/domain/trial';

export interface Trx { id?: string; arah: 'masuk' | 'keluar'; kategori: string; jumlah: number; tanggal: string; metode?: string | null; keterangan?: string | null; lampiran_url?: string | null; }

export { METODE_BAYAR } from '@/lib/metode';

export const KATEGORI_MASUK = ['event', 'membership', 'store'];
export const KATEGORI_KELUAR = ['marketing', 'event', 'server', 'domain', 'software', 'office', 'transport', 'gaji', 'aset', 'pajak', 'lainnya'];
export const LABEL_KATEGORI: Record<string, string> = {
  event: 'Event', membership: 'Membership', store: 'Store',
  marketing: 'Marketing', server: 'Server', domain: 'Domain', software: 'Software',
  office: 'Office', transport: 'Transport', gaji: 'Gaji', aset: 'Aset', pajak: 'Pajak', lainnya: 'Lainnya',
};

function bulanSebelum(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function labelBulan(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('id-ID', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

async function ambilSemua(): Promise<Trx[]> {
  try {
    const s = await createClient();
    const { data } = await s.from('transaksi_keuangan').select('arah,kategori,jumlah,tanggal');
    return (data ?? []) as Trx[];
  } catch { return []; }
}

const sum = (arr: Trx[]) => arr.reduce((a, t) => a + (t.jumlah || 0), 0);

export interface DashboardKeuangan {
  revenueHariIni: number; revenueBulanIni: number; expenseBulanIni: number; netProfitBulanIni: number;
  saldoKas: number; mrr: number; activeMember: number; eventBulanIni: number; storeOrderBulanIni: number; growthPersen: number | null;
}

export async function getDashboardKeuangan(): Promise<DashboardKeuangan> {
  const today = tanggalWIB();
  const bulanIni = today.slice(0, 7);
  const bulanLalu = bulanSebelum(bulanIni, 1);
  const [trx, langgananRes] = await Promise.all([
    ambilSemua(),
    (async () => { try { const s = await createClient(); const { data } = await s.from('langganan').select('trial_mulai,aktif_sampai,nominal'); return data ?? []; } catch { return []; } })(),
  ]);

  const masuk = trx.filter((t) => t.arah === 'masuk');
  const keluar = trx.filter((t) => t.arah === 'keluar');
  const masukBulan = (ym: string) => sum(masuk.filter((t) => (t.tanggal ?? '').startsWith(ym)));

  // MRR & active member dari snapshot langganan
  const now = new Date();
  let mrr = 0, activeMember = 0;
  for (const l of langgananRes as { trial_mulai: string; aktif_sampai: string | null; nominal: number }[]) {
    const st = statusLangganan({ trialMulai: new Date(l.trial_mulai + 'T00:00:00Z'), aktifSampai: l.aktif_sampai ? new Date(l.aktif_sampai + 'T00:00:00Z') : null }, now);
    if (st === 'aktif') { mrr += l.nominal || 0; activeMember++; }
  }

  const revBulanIni = masukBulan(bulanIni);
  const revBulanLalu = masukBulan(bulanLalu);
  const expBulanIni = sum(keluar.filter((t) => (t.tanggal ?? '').startsWith(bulanIni)));

  return {
    revenueHariIni: sum(masuk.filter((t) => t.tanggal === today)),
    revenueBulanIni: revBulanIni,
    expenseBulanIni: expBulanIni,
    netProfitBulanIni: revBulanIni - expBulanIni,
    saldoKas: sum(masuk) - sum(keluar),
    mrr, activeMember,
    eventBulanIni: masuk.filter((t) => t.kategori === 'event' && (t.tanggal ?? '').startsWith(bulanIni)).length,
    storeOrderBulanIni: masuk.filter((t) => t.kategori === 'store' && (t.tanggal ?? '').startsWith(bulanIni)).length,
    growthPersen: revBulanLalu > 0 ? Math.round(((revBulanIni - revBulanLalu) / revBulanLalu) * 100) : null,
  };
}

/** Daftar transaksi (untuk halaman Ledger & Cash Flow), filter periode & arah/kategori. */
export async function getLedger(opts?: { from?: string; to?: string; arah?: string; kategori?: string; limit?: number }): Promise<Trx[]> {
  try {
    const s = await createClient();
    let q = s.from('transaksi_keuangan').select('id,arah,kategori,jumlah,tanggal,metode,keterangan,lampiran_url').order('tanggal', { ascending: false }).order('created_at', { ascending: false });
    if (opts?.from) q = q.gte('tanggal', opts.from);
    if (opts?.to) q = q.lte('tanggal', opts.to);
    if (opts?.arah) q = q.eq('arah', opts.arah);
    if (opts?.kategori) q = q.eq('kategori', opts.kategori);
    q = q.limit(opts?.limit ?? 500);
    const { data } = await q;
    return (data ?? []) as Trx[];
  } catch { return []; }
}

export interface BarisBulan { ym: string; label: string; masuk: number; keluar: number; }
/** Ringkasan masuk/keluar per bulan untuk N bulan terakhir (termasuk bulan ini). */
export async function getPerBulan(n = 6): Promise<BarisBulan[]> {
  const trx = await ambilSemua();
  const bulanIni = tanggalWIB().slice(0, 7);
  const out: BarisBulan[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ym = bulanSebelum(bulanIni, i);
    out.push({
      ym, label: labelBulan(ym),
      masuk: sum(trx.filter((t) => t.arah === 'masuk' && (t.tanggal ?? '').startsWith(ym))),
      keluar: sum(trx.filter((t) => t.arah === 'keluar' && (t.tanggal ?? '').startsWith(ym))),
    });
  }
  return out;
}

/** Agregasi per kategori dalam rentang (default: sepanjang waktu). */
export async function getPerKategori(arah: 'masuk' | 'keluar', from?: string, to?: string): Promise<{ kategori: string; total: number }[]> {
  const trx = (await ambilSemua()).filter((t) => t.arah === arah && (!from || t.tanggal >= from) && (!to || t.tanggal <= to));
  const m = new Map<string, number>();
  for (const t of trx) m.set(t.kategori, (m.get(t.kategori) ?? 0) + (t.jumlah || 0));
  return [...m.entries()].map(([kategori, total]) => ({ kategori, total })).sort((a, b) => b.total - a.total);
}

export async function getKategoriAset(): Promise<{ id: string; nama: string }[]> {
  try {
    const s = await createClient();
    const { data } = await s.from('kategori_aset').select('id,nama').order('nama');
    return (data ?? []) as { id: string; nama: string }[];
  } catch { return []; }
}

export interface AsetRow { id: string; nama: string; kategori: string | null; harga_beli: number; tanggal_beli: string | null; umur_manfaat_bulan: number | null; lokasi: string | null; invoice_url: string | null; catatan: string | null; }
export async function getAset(): Promise<AsetRow[]> {
  try {
    const s = await createClient();
    const { data } = await s.from('aset').select('id,nama,kategori,harga_beli,tanggal_beli,umur_manfaat_bulan,lokasi,invoice_url,catatan').order('created_at', { ascending: false });
    return (data ?? []) as AsetRow[];
  } catch { return []; }
}
