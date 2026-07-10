// src/lib/data/keuangan.ts — baca & agregasi data keuangan (admin/investor)
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { statusLangganan } from '@/lib/domain/trial';

export interface Trx { id?: string; arah: 'masuk' | 'keluar'; kategori: string; jumlah: number; tanggal: string; metode?: string | null; keterangan?: string | null; lampiran_url?: string | null; ref_tipe?: string | null; ref_id?: string | null; }

export { METODE_BAYAR } from '@/lib/metode';

export const KATEGORI_MASUK = ['event', 'membership', 'store', 'sponsorship'];
export const KATEGORI_KELUAR = ['marketing', 'event', 'server', 'domain', 'software', 'office', 'transport', 'gaji', 'aset', 'pajak', 'lainnya'];
export const LABEL_KATEGORI: Record<string, string> = {
  event: 'Event', membership: 'Membership', store: 'Store', sponsorship: 'Sponsorship',
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
    let q = s.from('transaksi_keuangan').select('id,arah,kategori,jumlah,tanggal,metode,keterangan,lampiran_url,ref_tipe,ref_id').order('tanggal', { ascending: false }).order('created_at', { ascending: false });
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

export interface KatPengeluaran { id: string; kode: string; nama: string; bawaan: boolean; }
// fallback ke konstanta bila tabel master belum ada (deploy-safe sebelum migrasi 0055)
const builtinPengeluaran = (): KatPengeluaran[] => KATEGORI_KELUAR.map((k) => ({ id: k, kode: k, nama: LABEL_KATEGORI[k] ?? k, bawaan: true }));

export async function getKategoriPengeluaran(): Promise<KatPengeluaran[]> {
  try {
    const s = await createClient();
    const { data, error } = await s.from('kategori_pengeluaran').select('id,kode,nama,bawaan').order('bawaan', { ascending: false }).order('nama');
    if (error || !data || data.length === 0) return builtinPengeluaran();
    return data as KatPengeluaran[];
  } catch { return builtinPengeluaran(); }
}

export interface TransaksiDetail {
  trx: Trx & { created_at?: string };
  jenis: 'pesanan' | 'pendaftaran' | 'langganan' | 'lainnya';
  pembeli?: { email?: string | null; nama?: string | null; no_wa?: string | null } | null;
  pesanan?: { status: string; subtotal: number; ongkir: number; total: number; penerima: string | null; no_hp: string | null; alamat: string | null; no_resi: string | null; catatan: string | null; bukti_url: string | null; created_at: string; items: { nama: string; harga: number; qty: number }[] } | null;
  event?: { judul: string; tanggal: string | null; lokasi: string | null; anak: string[]; jumlah_anak: number; total: number; status: string; bukti_url: string | null; created_at: string } | null;
  langganan?: { nominal: number; metode: string | null; periode_mulai: string | null; periode_sampai: string | null; dibayar_pada: string }[] | null;
}

/** Detail satu transaksi ledger + sumber aslinya (pesanan/pendaftaran/langganan). */
export async function getTransaksiDetail(id: string): Promise<TransaksiDetail | null> {
  try {
    const s = await createClient();
    const { data: trx } = await s.from('transaksi_keuangan')
      .select('id,arah,kategori,jumlah,tanggal,metode,keterangan,lampiran_url,ref_tipe,ref_id,created_at')
      .eq('id', id).maybeSingle();
    if (!trx) return null;
    const t = trx as TransaksiDetail['trx'];
    const out: TransaksiDetail = { trx: t, jenis: 'lainnya' };

    if (t.ref_tipe === 'pesanan' && t.ref_id) {
      out.jenis = 'pesanan';
      const { data: p } = await s.from('pesanan')
        .select('ortu_id,status,subtotal,ongkir,total,penerima,no_hp,alamat,no_resi,catatan,bukti_url,created_at,item:item_pesanan(nama,harga,qty)')
        .eq('id', t.ref_id).maybeSingle();
      if (p) {
        const pp = p as unknown as { ortu_id: string; status: string; subtotal: number; ongkir: number; total: number; penerima: string | null; no_hp: string | null; alamat: string | null; no_resi: string | null; catatan: string | null; bukti_url: string | null; created_at: string; item: { nama: string; harga: number; qty: number }[] };
        out.pesanan = { status: pp.status, subtotal: pp.subtotal, ongkir: pp.ongkir, total: pp.total, penerima: pp.penerima, no_hp: pp.no_hp, alamat: pp.alamat, no_resi: pp.no_resi, catatan: pp.catatan, bukti_url: pp.bukti_url, created_at: pp.created_at, items: pp.item ?? [] };
        out.pembeli = await ambilPembeli(s, pp.ortu_id);
      }
    } else if (t.ref_tipe === 'pendaftaran' && t.ref_id) {
      out.jenis = 'pendaftaran';
      const { data: p } = await s.from('pendaftaran_event')
        .select('ortu_id,anak_nama,jumlah_anak,total,status,bukti_url,created_at,event:event_id(judul,tanggal,lokasi)')
        .eq('id', t.ref_id).maybeSingle();
      if (p) {
        const pp = p as unknown as { ortu_id: string; anak_nama: string[]; jumlah_anak: number; total: number; status: string; bukti_url: string | null; created_at: string; event: { judul: string; tanggal: string | null; lokasi: string | null } | { judul: string; tanggal: string | null; lokasi: string | null }[] | null };
        const ev = Array.isArray(pp.event) ? pp.event[0] : pp.event;
        out.event = { judul: ev?.judul ?? '(event terhapus)', tanggal: ev?.tanggal ?? null, lokasi: ev?.lokasi ?? null, anak: pp.anak_nama ?? [], jumlah_anak: pp.jumlah_anak, total: pp.total, status: pp.status, bukti_url: pp.bukti_url, created_at: pp.created_at };
        out.pembeli = await ambilPembeli(s, pp.ortu_id);
      }
    } else if (t.ref_tipe === 'langganan' && t.ref_id) {
      out.jenis = 'langganan';
      out.pembeli = await ambilPembeli(s, t.ref_id);
      const { data: bayar } = await s.from('pembayaran_langganan')
        .select('nominal,metode,periode_mulai,periode_sampai,dibayar_pada')
        .eq('ortu_id', t.ref_id).order('dibayar_pada', { ascending: false }).limit(24);
      out.langganan = (bayar ?? []) as TransaksiDetail['langganan'];
    }
    return out;
  } catch { return null; }
}

async function ambilPembeli(s: Awaited<ReturnType<typeof createClient>>, ortuId: string) {
  const { data } = await s.from('profiles').select('email,nama_tampilan,no_wa').eq('id', ortuId).maybeSingle();
  const d = data as { email: string | null; nama_tampilan: string | null; no_wa: string | null } | null;
  return d ? { email: d.email, nama: d.nama_tampilan, no_wa: d.no_wa } : null;
}

export interface AsetRow { id: string; nama: string; kategori: string | null; harga_beli: number; tanggal_beli: string | null; umur_manfaat_bulan: number | null; lokasi: string | null; invoice_url: string | null; catatan: string | null; }
export async function getAset(): Promise<AsetRow[]> {
  try {
    const s = await createClient();
    const { data } = await s.from('aset').select('id,nama,kategori,harga_beli,tanggal_beli,umur_manfaat_bulan,lokasi,invoice_url,catatan').order('created_at', { ascending: false });
    return (data ?? []) as AsetRow[];
  } catch { return []; }
}
