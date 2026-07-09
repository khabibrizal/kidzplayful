// src/lib/data/kpi.ts — agregasi KPI & Business Intelligence (Fase 2, admin/investor)
// Semua diturunkan dari data existing (ledger, langganan, pembayaran_langganan, pesanan, aktivitas).
// Tanpa tabel baru. Metrik retensi/CAC akurat SEJAK modul keuangan aktif (histori sebelumnya tak lengkap).
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { statusLangganan } from '@/lib/domain/trial';

const HARI = 86_400_000;
const ymOf = (iso: string) => (iso ?? '').slice(0, 7);
function bulanSebelum(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function labelBulan(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

type Lang = { trial_mulai: string; aktif_sampai: string | null; nominal: number };
type Bayar = { ortu_id: string; nominal: number; periode_mulai: string | null; periode_sampai: string | null; dibayar_pada: string };
type Trx = { arah: 'masuk' | 'keluar'; kategori: string; jumlah: number; tanggal: string };

export interface Kpi {
  sejak: string | null;           // bulan pertama ada data pembayaran (untuk disclaimer)
  mrr: number; arr: number; mrrGrowthPersen: number | null;
  activeMember: number; arpu: number; ltv: number | null;
  churnPersen: number | null; retentionPersen: number | null;
  memberBaruBulanIni: number; perpanjanganBulanIni: number;
  cac: number | null; ltvCac: number | null; marketingBulanIni: number;
  revenueBulanIni: number; expenseBulanIni: number; netMarginPersen: number | null;
  burnRate: number; runwayBulan: number | null; saldoKas: number;
  aovStore: number; pesananBulanIni: number; eventBulanIni: number;
  dau: number; mau: number; stickinessPersen: number | null;
}

const sum = (a: number, b: number) => a + b;

export async function getKpi(): Promise<Kpi> {
  const kosong: Kpi = { sejak: null, mrr: 0, arr: 0, mrrGrowthPersen: null, activeMember: 0, arpu: 0, ltv: null, churnPersen: null, retentionPersen: null, memberBaruBulanIni: 0, perpanjanganBulanIni: 0, cac: null, ltvCac: null, marketingBulanIni: 0, revenueBulanIni: 0, expenseBulanIni: 0, netMarginPersen: null, burnRate: 0, runwayBulan: null, saldoKas: 0, aovStore: 0, pesananBulanIni: 0, eventBulanIni: 0, dau: 0, mau: 0, stickinessPersen: null };
  try {
    const s = await createClient();
    const today = tanggalWIB();
    const bulanIni = today.slice(0, 7);
    const bulanLalu = bulanSebelum(bulanIni, 1);
    const now = Date.now();
    const cutoff30 = new Date(now - 30 * HARI).toISOString().slice(0, 10);
    const cutoffMauIso = new Date(now - 30 * HARI).toISOString();
    const cutoffHariIni = new Date(today + 'T00:00:00+07:00').toISOString();

    const [langRes, bayarRes, trxRes, aktRes] = await Promise.all([
      s.from('langganan').select('trial_mulai,aktif_sampai,nominal'),
      s.from('pembayaran_langganan').select('ortu_id,nominal,periode_mulai,periode_sampai,dibayar_pada').order('dibayar_pada', { ascending: true }),
      s.from('transaksi_keuangan').select('arah,kategori,jumlah,tanggal'),
      s.from('aktivitas').select('ortu_id,dibuat_at').gte('dibuat_at', cutoffMauIso).limit(5000),
    ]);
    const lang = (langRes.data ?? []) as Lang[];
    const bayar = (bayarRes.data ?? []) as Bayar[];
    const trx = (trxRes.data ?? []) as Trx[];
    const akt = (aktRes.data ?? []) as { ortu_id: string; dibuat_at: string }[];

    // --- MRR & member aktif (snapshot langganan) ---
    const nowDate = new Date();
    let mrr = 0, activeMember = 0;
    for (const l of lang) {
      const st = statusLangganan({ trialMulai: new Date(l.trial_mulai + 'T00:00:00Z'), aktifSampai: l.aktif_sampai ? new Date(l.aktif_sampai + 'T00:00:00Z') : null }, nowDate);
      if (st === 'aktif') { mrr += l.nominal || 0; activeMember++; }
    }
    const arpu = activeMember > 0 ? Math.round(mrr / activeMember) : 0;

    // --- Revenue/expense dari ledger ---
    const masuk = trx.filter((t) => t.arah === 'masuk');
    const keluar = trx.filter((t) => t.arah === 'keluar');
    const inBulan = (arr: Trx[], ym: string) => arr.filter((t) => ymOf(t.tanggal) === ym).map((t) => t.jumlah).reduce(sum, 0);
    const revenueBulanIni = inBulan(masuk, bulanIni);
    const expenseBulanIni = inBulan(keluar, bulanIni);
    const netBulanIni = revenueBulanIni - expenseBulanIni;
    const netMarginPersen = revenueBulanIni > 0 ? Math.round((netBulanIni / revenueBulanIni) * 100) : null;
    const saldoKas = masuk.map((t) => t.jumlah).reduce(sum, 0) - keluar.map((t) => t.jumlah).reduce(sum, 0);
    const marketingBulanIni = keluar.filter((t) => t.kategori === 'marketing' && ymOf(t.tanggal) === bulanIni).map((t) => t.jumlah).reduce(sum, 0);

    // MRR growth: revenue membership bulan ini vs bulan lalu (dari ledger)
    const memRev = (ym: string) => masuk.filter((t) => t.kategori === 'membership' && ymOf(t.tanggal) === ym).map((t) => t.jumlah).reduce(sum, 0);
    const memIni = memRev(bulanIni), memLalu = memRev(bulanLalu);
    const mrrGrowthPersen = memLalu > 0 ? Math.round(((memIni - memLalu) / memLalu) * 100) : null;

    // AOV & jumlah pesanan/event bulan ini (dari ledger)
    const storeRows = masuk.filter((t) => t.kategori === 'store' && ymOf(t.tanggal) === bulanIni);
    const pesananBulanIni = storeRows.length;
    const aovStore = pesananBulanIni > 0 ? Math.round(storeRows.map((t) => t.jumlah).reduce(sum, 0) / pesananBulanIni) : 0;
    const eventBulanIni = masuk.filter((t) => t.kategori === 'event' && ymOf(t.tanggal) === bulanIni).length;

    // --- Member baru vs perpanjangan (pembayaran_langganan) ---
    const pertama = new Map<string, string>(); // ortu_id -> tgl bayar pertama (asc → yg pertama menang)
    for (const b of bayar) if (!pertama.has(b.ortu_id)) pertama.set(b.ortu_id, b.dibayar_pada);
    let memberBaruBulanIni = 0, perpanjanganBulanIni = 0;
    for (const b of bayar) {
      if (ymOf(b.dibayar_pada) !== bulanIni) continue;
      if (pertama.get(b.ortu_id) === b.dibayar_pada) memberBaruBulanIni++; else perpanjanganBulanIni++;
    }
    const cac = memberBaruBulanIni > 0 ? Math.round(marketingBulanIni / memberBaruBulanIni) : null;

    // --- Churn 30 hari (approx): member yang periode_sampai-nya lewat dalam 30 hari & kini tak aktif ---
    const terakhirSampai = new Map<string, string>(); // ortu_id -> periode_sampai terbaru
    for (const b of bayar) {
      if (!b.periode_sampai) continue;
      const prev = terakhirSampai.get(b.ortu_id);
      if (!prev || b.periode_sampai > prev) terakhirSampai.set(b.ortu_id, b.periode_sampai);
    }
    let lapse30 = 0;
    for (const [, sampai] of terakhirSampai) {
      if (sampai >= cutoff30 && sampai < today) lapse30++; // berakhir dalam 30 hari & sudah lewat (tak diperpanjang)
    }
    const basisChurn = activeMember + lapse30;
    const churnPersen = basisChurn > 0 ? Math.round((lapse30 / basisChurn) * 100) : null;
    const retentionPersen = churnPersen === null ? null : 100 - churnPersen;
    const ltv = churnPersen && churnPersen > 0 ? Math.round(arpu / (churnPersen / 100)) : null;
    const ltvCac = ltv !== null && cac && cac > 0 ? Math.round((ltv / cac) * 10) / 10 : null;

    // --- Burn rate & runway (rata-rata net 3 bulan terakhir) ---
    let netTotal3 = 0;
    for (let i = 0; i < 3; i++) {
      const ym = bulanSebelum(bulanIni, i);
      netTotal3 += inBulan(masuk, ym) - inBulan(keluar, ym);
    }
    const netAvg3 = netTotal3 / 3;
    const burnRate = netAvg3 < 0 ? Math.round(-netAvg3) : 0;
    const runwayBulan = burnRate > 0 ? Math.round((saldoKas / burnRate) * 10) / 10 : null; // null = tidak sedang burn

    // --- DAU / MAU (aktivitas) ---
    const mauSet = new Set(akt.map((a) => a.ortu_id));
    const dauSet = new Set(akt.filter((a) => a.dibuat_at >= cutoffHariIni).map((a) => a.ortu_id));
    const mau = mauSet.size, dau = dauSet.size;
    const stickinessPersen = mau > 0 ? Math.round((dau / mau) * 100) : null;

    const sejak = bayar.length ? labelBulan(ymOf(bayar[0].dibayar_pada)) : null;

    return {
      sejak, mrr, arr: mrr * 12, mrrGrowthPersen, activeMember, arpu, ltv,
      churnPersen, retentionPersen, memberBaruBulanIni, perpanjanganBulanIni,
      cac, ltvCac, marketingBulanIni, revenueBulanIni, expenseBulanIni, netMarginPersen,
      burnRate, runwayBulan, saldoKas, aovStore, pesananBulanIni, eventBulanIni,
      dau, mau, stickinessPersen,
    };
  } catch { return kosong; }
}

// ================= BUSINESS INTELLIGENCE / INSIGHT =================
export interface TrenBulan { ym: string; label: string; masuk: number; keluar: number; net: number; }
export interface MixItem { kategori: string; total: number; persen: number; }
export interface Cohort { ym: string; label: string; total: number; aktif: number; retensiPersen: number; }
export interface TopItem { nama: string; nilai: number; jml: number; }
export interface Insight { tren12: TrenBulan[]; mix: MixItem[]; cohort: Cohort[]; topProduk: TopItem[]; topEvent: TopItem[]; catatan: string[]; }

export async function getInsight(): Promise<Insight> {
  const kosong: Insight = { tren12: [], mix: [], cohort: [], topProduk: [], topEvent: [], catatan: [] };
  try {
    const s = await createClient();
    const bulanIni = tanggalWIB().slice(0, 7);
    const now = new Date();

    const [trxRes, profRes, langRes, itemRes, pendRes] = await Promise.all([
      s.from('transaksi_keuangan').select('arah,kategori,jumlah,tanggal'),
      s.from('profiles').select('id,created_at'),
      s.from('langganan').select('ortu_id,trial_mulai,aktif_sampai'),
      s.from('item_pesanan').select('nama,harga,qty,pesanan:pesanan_id(status)').limit(3000),
      s.from('pendaftaran_event').select('total,status,event:event_id(judul)').eq('status', 'diterima').limit(3000),
    ]);
    const trx = (trxRes.data ?? []) as Trx[];
    const prof = (profRes.data ?? []) as { id: string; created_at: string }[];
    const lang = (langRes.data ?? []) as (Lang & { ortu_id: string })[];

    // Tren 12 bulan
    const tren12: TrenBulan[] = [];
    for (let i = 11; i >= 0; i--) {
      const ym = bulanSebelum(bulanIni, i);
      const masuk = trx.filter((t) => t.arah === 'masuk' && ymOf(t.tanggal) === ym).map((t) => t.jumlah).reduce(sum, 0);
      const keluar = trx.filter((t) => t.arah === 'keluar' && ymOf(t.tanggal) === ym).map((t) => t.jumlah).reduce(sum, 0);
      tren12.push({ ym, label: labelBulan(ym), masuk, keluar, net: masuk - keluar });
    }

    // Revenue mix (kategori masuk, sepanjang waktu)
    const mm = new Map<string, number>();
    for (const t of trx) if (t.arah === 'masuk') mm.set(t.kategori, (mm.get(t.kategori) ?? 0) + t.jumlah);
    const totalMix = [...mm.values()].reduce(sum, 0);
    const mix: MixItem[] = [...mm.entries()].map(([kategori, total]) => ({ kategori, total, persen: totalMix > 0 ? Math.round((total / totalMix) * 100) : 0 })).sort((a, b) => b.total - a.total);

    // Cohort retention: member per bulan daftar → berapa yang kini masih aktif berlangganan
    const aktifIds = new Set<string>();
    for (const l of lang) {
      const st = statusLangganan({ trialMulai: new Date(l.trial_mulai + 'T00:00:00Z'), aktifSampai: l.aktif_sampai ? new Date(l.aktif_sampai + 'T00:00:00Z') : null }, now);
      if (st === 'aktif') aktifIds.add(l.ortu_id);
    }
    const cohortMap = new Map<string, { total: number; aktif: number }>();
    for (const p of prof) {
      const ym = ymOf(p.created_at);
      const c = cohortMap.get(ym) ?? { total: 0, aktif: 0 };
      c.total++; if (aktifIds.has(p.id)) c.aktif++; cohortMap.set(ym, c);
    }
    const cohort: Cohort[] = [...cohortMap.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6)
      .map(([ym, c]) => ({ ym, label: labelBulan(ym), total: c.total, aktif: c.aktif, retensiPersen: c.total > 0 ? Math.round((c.aktif / c.total) * 100) : 0 }));

    // Top produk (dari item pesanan yang pesanannya lunas/diproses ke atas)
    const okStatus = new Set(['diproses', 'dikirim', 'selesai']);
    const pm = new Map<string, { nilai: number; jml: number }>();
    for (const it of (itemRes.data ?? []) as unknown as { nama: string; harga: number; qty: number; pesanan: { status: string } | { status: string }[] | null }[]) {
      const pes = Array.isArray(it.pesanan) ? it.pesanan[0] : it.pesanan;
      if (!pes || !okStatus.has(pes.status)) continue;
      const cur = pm.get(it.nama) ?? { nilai: 0, jml: 0 };
      cur.nilai += (it.harga || 0) * (it.qty || 0); cur.jml += it.qty || 0; pm.set(it.nama, cur);
    }
    const topProduk: TopItem[] = [...pm.entries()].map(([nama, v]) => ({ nama, nilai: v.nilai, jml: v.jml })).sort((a, b) => b.nilai - a.nilai).slice(0, 5);

    // Top event (pendaftaran diterima)
    const em = new Map<string, { nilai: number; jml: number }>();
    for (const p of (pendRes.data ?? []) as unknown as { total: number; event: { judul: string } | { judul: string }[] | null }[]) {
      const ev = Array.isArray(p.event) ? p.event[0] : p.event;
      const nama = ev?.judul ?? '(event terhapus)';
      const cur = em.get(nama) ?? { nilai: 0, jml: 0 };
      cur.nilai += p.total || 0; cur.jml += 1; em.set(nama, cur);
    }
    const topEvent: TopItem[] = [...em.entries()].map(([nama, v]) => ({ nama, nilai: v.nilai, jml: v.jml })).sort((a, b) => b.nilai - a.nilai).slice(0, 5);

    // Auto-insight
    const catatan: string[] = [];
    const ini = tren12[tren12.length - 1], lalu = tren12[tren12.length - 2];
    if (ini && lalu) {
      if (lalu.masuk > 0) {
        const g = Math.round(((ini.masuk - lalu.masuk) / lalu.masuk) * 100);
        catatan.push(`${g >= 0 ? '📈' : '📉'} Revenue bulan ini ${g >= 0 ? 'naik' : 'turun'} ${Math.abs(g)}% vs bulan lalu.`);
      }
      catatan.push(ini.net >= 0 ? `✅ Bulan ini surplus ${idr(ini.net)}.` : `⚠️ Bulan ini defisit ${idr(-ini.net)} — pengeluaran melebihi pemasukan.`);
    }
    if (mix.length) catatan.push(`🧩 Sumber pendapatan terbesar: ${labelKat(mix[0].kategori)} (${mix[0].persen}%).`);
    if (topProduk.length) catatan.push(`🛍️ Produk terlaris: ${topProduk[0].nama} (${topProduk[0].jml} terjual).`);
    if (topEvent.length) catatan.push(`🎪 Event dengan pemasukan tertinggi: ${topEvent[0].nama}.`);

    return { tren12, mix, cohort, topProduk, topEvent, catatan };
  } catch { return kosong; }
}

function idr(n: number) { return 'Rp' + (n || 0).toLocaleString('id-ID'); }
function labelKat(k: string) { return ({ store: 'Store', event: 'Event', membership: 'Membership' } as Record<string, string>)[k] ?? k; }
