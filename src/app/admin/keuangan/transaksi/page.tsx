// src/app/admin/keuangan/transaksi/page.tsx — Ledger + Cash Flow (filter per bulan)
import Link from 'next/link';
import { getLedger, LABEL_KATEGORI } from '@/lib/data/keuangan';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { formatRupiah } from '@/lib/format';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

export default async function TransaksiPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const { bulan } = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(bulan ?? '') ? bulan! : tanggalWIB().slice(0, 7);
  const from = `${ym}-01`;
  const to = `${ym}-31`;
  const rows = await getLedger({ from, to, limit: 1000 });
  const masuk = rows.filter((r) => r.arah === 'masuk').reduce((a, r) => a + r.jumlah, 0);
  const keluar = rows.filter((r) => r.arah === 'keluar').reduce((a, r) => a + r.jumlah, 0);

  // navigasi bulan
  const [y, m] = ym.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)), next = new Date(Date.UTC(y, m, 1));
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const labelYm = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>📒 Transaksi</h1></div>
      <KeuanganNav />

      <div className={s.row} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href={`/admin/keuangan/transaksi?bulan=${fmt(prev)}`} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>←</Link>
        <b>{labelYm}</b>
        <Link href={`/admin/keuangan/transaksi?bulan=${fmt(next)}`} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>→</Link>
      </div>

      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#1c7a43' }}>{formatRupiah(masuk)}</div><div className={s.muted} style={{ fontSize: 11 }}>Kas masuk</div></div>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#c0392b' }}>{formatRupiah(keluar)}</div><div className={s.muted} style={{ fontSize: 11 }}>Kas keluar</div></div>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800, color: masuk - keluar >= 0 ? '#1c7a43' : '#c0392b' }}>{formatRupiah(masuk - keluar)}</div><div className={s.muted} style={{ fontSize: 11 }}>Selisih</div></div>
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Rincian ({rows.length})</div>
      {rows.length === 0 && <p className={s.muted}>Tidak ada transaksi di bulan ini.</p>}
      {rows.map((t) => (
        <div key={t.id} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ color: t.arah === 'masuk' ? '#1c7a43' : '#c0392b' }}>{LABEL_KATEGORI[t.kategori] ?? t.kategori}</b>
            <br /><small className={s.muted}>{t.tanggal}{t.keterangan ? ` · ${t.keterangan}` : ''}{t.metode ? ` · ${t.metode}` : ''}</small>
          </span>
          <span style={{ fontWeight: 800, color: t.arah === 'masuk' ? '#1c7a43' : '#c0392b' }}>{t.arah === 'masuk' ? '+' : '−'}{formatRupiah(t.jumlah)}</span>
        </div>
      ))}
    </div>
  );
}
