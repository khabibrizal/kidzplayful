// src/app/admin/keuangan/page.tsx — Dashboard CEO
import { getDashboardKeuangan, getLedger, LABEL_KATEGORI } from '@/lib/data/keuangan';
import { formatRupiah } from '@/lib/format';
import KeuanganNav from './KeuanganNav';
import s from '../admin.module.css';

function K({ b, l, warna }: { b: string; l: string; warna?: string }) {
  return (
    <div className={s.card} style={{ flex: 1, minWidth: 150, textAlign: 'center', padding: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: warna ?? 'var(--lavender-d)' }}>{b}</div>
      <div style={{ fontSize: 12, color: 'var(--abu)' }}>{l}</div>
    </div>
  );
}

export default async function KeuanganDashboard() {
  const [d, recent] = await Promise.all([getDashboardKeuangan(), getLedger({ limit: 10 })]);
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💼 Keuangan</h1></div>
      <KeuanganNav />

      <div className={s.section}>Pendapatan & Laba</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <K b={formatRupiah(d.revenueHariIni)} l="Revenue hari ini" />
        <K b={formatRupiah(d.revenueBulanIni)} l="Revenue bulan ini" />
        <K b={formatRupiah(d.expenseBulanIni)} l="Expense bulan ini" warna="#c0392b" />
        <K b={formatRupiah(d.netProfitBulanIni)} l="Net profit bulan ini" warna={d.netProfitBulanIni >= 0 ? '#1c7a43' : '#c0392b'} />
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Kas & Member</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <K b={formatRupiah(d.saldoKas)} l="Saldo kas (akumulasi)" warna={d.saldoKas >= 0 ? '#1c7a43' : '#c0392b'} />
        <K b={formatRupiah(d.mrr)} l="MRR" />
        <K b={String(d.activeMember)} l="Member aktif" />
        <K b={d.growthPersen === null ? '—' : `${d.growthPersen > 0 ? '+' : ''}${d.growthPersen}%`} l="Growth vs bln lalu" warna={(d.growthPersen ?? 0) >= 0 ? '#1c7a43' : '#c0392b'} />
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Aktivitas bulan ini</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <K b={String(d.eventBulanIni)} l="Pendaftaran event" />
        <K b={String(d.storeOrderBulanIni)} l="Pesanan store" />
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Transaksi terbaru</div>
      {recent.length === 0 && <p className={s.muted}>Belum ada transaksi. Pemasukan tercatat otomatis saat verifikasi pesanan / terima pendaftaran / aktivasi langganan.</p>}
      {recent.map((t) => (
        <div key={t.id} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ color: t.arah === 'masuk' ? '#1c7a43' : '#c0392b' }}>{t.arah === 'masuk' ? '↓ ' : '↑ '}{LABEL_KATEGORI[t.kategori] ?? t.kategori}</b>
            <br /><small className={s.muted}>{t.tanggal}{t.keterangan ? ` · ${t.keterangan}` : ''}</small>
          </span>
          <span style={{ fontWeight: 800, color: t.arah === 'masuk' ? '#1c7a43' : '#c0392b' }}>{t.arah === 'masuk' ? '+' : '−'}{formatRupiah(t.jumlah)}</span>
        </div>
      ))}
    </div>
  );
}
