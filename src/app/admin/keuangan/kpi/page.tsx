// src/app/admin/keuangan/kpi/page.tsx — KPI Dashboard (Fase 2A)
import { getKpi } from '@/lib/data/kpi';
import { formatRupiah } from '@/lib/format';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

function K({ b, l, sub, warna }: { b: string; l: string; sub?: string; warna?: string }) {
  return (
    <div className={s.card} style={{ flex: 1, minWidth: 150, textAlign: 'center', padding: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: warna ?? 'var(--lavender-d)' }}>{b}</div>
      <div style={{ fontSize: 12, color: 'var(--abu)' }}>{l}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--abu)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
const persen = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v}%`);
const hijauMerah = (v: number | null) => ((v ?? 0) >= 0 ? '#1c7a43' : '#c0392b');

export default async function KpiPage() {
  const d = await getKpi();
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎯 KPI</h1></div>
      <KeuanganNav />
      {d.sejak && <p className={s.muted} style={{ fontSize: 12 }}>Metrik retensi/CAC dihitung dari histori pembayaran sejak <b>{d.sejak}</b>.</p>}

      <div className={s.section}>Pertumbuhan & Member</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <K b={formatRupiah(d.mrr)} l="MRR" sub={`ARR ${formatRupiah(d.arr)}`} />
        <K b={persen(d.mrrGrowthPersen)} l="MRR growth (MoM)" warna={hijauMerah(d.mrrGrowthPersen)} />
        <K b={String(d.activeMember)} l="Member aktif" sub={`baru ${d.memberBaruBulanIni} · perpanjang ${d.perpanjanganBulanIni}`} />
        <K b={formatRupiah(d.arpu)} l="ARPU" sub="rata-rata per member" />
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Retensi</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <K b={d.churnPersen === null ? '—' : `${d.churnPersen}%`} l="Churn (30 hari)" warna={(d.churnPersen ?? 0) > 5 ? '#c0392b' : '#1c7a43'} />
        <K b={d.retentionPersen === null ? '—' : `${d.retentionPersen}%`} l="Retention" warna="#1c7a43" />
        <K b={d.ltv === null ? '—' : formatRupiah(d.ltv)} l="LTV" sub="estimasi (ARPU ÷ churn)" />
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Efisiensi & Profitabilitas</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <K b={d.cac === null ? '—' : formatRupiah(d.cac)} l="CAC" sub={`marketing ${formatRupiah(d.marketingBulanIni)}`} />
        <K b={d.ltvCac === null ? '—' : `${d.ltvCac}×`} l="LTV : CAC" sub="sehat ≥ 3×" warna={(d.ltvCac ?? 0) >= 3 ? '#1c7a43' : (d.ltvCac ?? 0) > 0 ? '#d35400' : undefined} />
        <K b={d.netMarginPersen === null ? '—' : `${d.netMarginPersen}%`} l="Net margin (bln ini)" warna={hijauMerah(d.netMarginPersen)} />
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Kas</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <K b={formatRupiah(d.saldoKas)} l="Saldo kas" warna={hijauMerah(d.saldoKas)} />
        <K b={d.burnRate > 0 ? formatRupiah(d.burnRate) : '—'} l="Burn rate / bln" sub="rata-rata 3 bln" warna={d.burnRate > 0 ? '#c0392b' : undefined} />
        <K b={d.runwayBulan === null ? '∞' : `${d.runwayBulan} bln`} l="Runway" sub={d.runwayBulan === null ? 'tidak sedang defisit' : 'sisa kas'} warna={d.runwayBulan !== null && d.runwayBulan < 3 ? '#c0392b' : '#1c7a43'} />
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Operasional & Engagement</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <K b={formatRupiah(d.aovStore)} l="AOV store" sub={`${d.pesananBulanIni} pesanan bln ini`} />
        <K b={String(d.eventBulanIni)} l="Pendaftaran event (bln ini)" />
        <K b={String(d.dau)} l="DAU (hari ini)" />
        <K b={String(d.mau)} l="MAU (30 hari)" sub={d.stickinessPersen === null ? undefined : `stickiness ${d.stickinessPersen}%`} />
      </div>
    </div>
  );
}
