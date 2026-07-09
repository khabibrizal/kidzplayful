// src/app/admin/keuangan/insight/page.tsx — Business Intelligence / Insight (Fase 2B)
import { getInsight } from '@/lib/data/kpi';
import { formatRupiah } from '@/lib/format';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

const LABEL_KAT: Record<string, string> = { store: 'Store', event: 'Event', membership: 'Membership' };
const WARNA_KAT: Record<string, string> = { store: '#7c5cff', event: '#e67e22', membership: '#1c9c6b' };

export default async function InsightPage() {
  const d = await getInsight();
  const maxTren = Math.max(1, ...d.tren12.map((t) => Math.max(t.masuk, t.keluar)));

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💡 Insight</h1></div>
      <KeuanganNav />

      {/* Auto-insight */}
      {d.catatan.length > 0 && (
        <div className={s.card} style={{ background: '#f6f2ff', borderLeft: '4px solid var(--lavender-d)' }}>
          {d.catatan.map((c, i) => <div key={i} style={{ fontSize: 14, padding: '3px 0' }}>{c}</div>)}
        </div>
      )}

      {/* Tren 12 bulan */}
      <div className={s.section}>Tren 12 Bulan (masuk vs keluar)</div>
      <div className={s.card} style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minWidth: 560, height: 160 }}>
          {d.tren12.map((t) => (
            <div key={t.ym} style={{ flex: 1, textAlign: 'center', minWidth: 34 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: 120 }} title={`Masuk ${formatRupiah(t.masuk)} · Keluar ${formatRupiah(t.keluar)} · Net ${formatRupiah(t.net)}`}>
                <div style={{ width: 9, height: `${Math.round((t.masuk / maxTren) * 100)}%`, background: '#1c9c6b', borderRadius: '3px 3px 0 0' }} />
                <div style={{ width: 9, height: `${Math.round((t.keluar / maxTren) * 100)}%`, background: '#e05a5a', borderRadius: '3px 3px 0 0' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--abu)', marginTop: 4 }}>{t.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--abu)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1c9c6b', borderRadius: 2 }} /> Masuk</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#e05a5a', borderRadius: 2 }} /> Keluar</span>
        </div>
      </div>

      {/* Revenue mix */}
      <div className={s.section} style={{ marginTop: 14 }}>Sumber Pendapatan (mix)</div>
      <div className={s.card}>
        {d.mix.length === 0 && <p className={s.muted}>Belum ada pemasukan.</p>}
        <div style={{ display: 'flex', height: 22, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          {d.mix.map((m) => <div key={m.kategori} style={{ width: `${m.persen}%`, background: WARNA_KAT[m.kategori] ?? '#bbb' }} title={`${LABEL_KAT[m.kategori] ?? m.kategori} ${m.persen}%`} />)}
        </div>
        {d.mix.map((m) => (
          <div key={m.kategori} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0', borderBottom: '1px solid #f0f0f5' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: WARNA_KAT[m.kategori] ?? '#bbb', borderRadius: 2, marginRight: 6 }} />{LABEL_KAT[m.kategori] ?? m.kategori}</span>
            <span><b>{formatRupiah(m.total)}</b> <span className={s.muted}>({m.persen}%)</span></span>
          </div>
        ))}
      </div>

      {/* Cohort retention */}
      <div className={s.section} style={{ marginTop: 14 }}>Retensi per Cohort Pendaftaran</div>
      <div className={s.card}>
        {d.cohort.length === 0 && <p className={s.muted}>Belum ada data member.</p>}
        {d.cohort.map((c) => (
          <div key={c.ym} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
            <span style={{ width: 64, fontSize: 13, color: 'var(--abu)' }}>{c.label}</span>
            <div style={{ flex: 1, background: '#f0f0f5', borderRadius: 6, height: 16, overflow: 'hidden' }}>
              <div style={{ width: `${c.retensiPersen}%`, height: '100%', background: 'var(--lavender-d)' }} />
            </div>
            <span style={{ width: 96, textAlign: 'right', fontSize: 12 }}>{c.aktif}/{c.total} aktif ({c.retensiPersen}%)</span>
          </div>
        ))}
      </div>

      {/* Top produk & event */}
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', marginTop: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className={s.section}>Top Produk</div>
          <div className={s.card}>
            {d.topProduk.length === 0 && <p className={s.muted}>Belum ada penjualan.</p>}
            {d.topProduk.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderBottom: '1px solid #f0f0f5' }}>
                <span>{i + 1}. {t.nama} <span className={s.muted}>×{t.jml}</span></span>
                <b>{formatRupiah(t.nilai)}</b>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className={s.section}>Top Event</div>
          <div className={s.card}>
            {d.topEvent.length === 0 && <p className={s.muted}>Belum ada pendaftaran diterima.</p>}
            {d.topEvent.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderBottom: '1px solid #f0f0f5' }}>
                <span>{i + 1}. {t.nama} <span className={s.muted}>×{t.jml}</span></span>
                <b>{formatRupiah(t.nilai)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
