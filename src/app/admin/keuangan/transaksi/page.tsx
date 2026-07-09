// src/app/admin/keuangan/transaksi/page.tsx — Ledger + Cash Flow + filter rentang tanggal & kategori
import { getLedger, LABEL_KATEGORI, KATEGORI_MASUK, KATEGORI_KELUAR } from '@/lib/data/keuangan';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { formatRupiah } from '@/lib/format';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

export default async function TransaksiPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; arah?: string; kategori?: string }> }) {
  const sp = await searchParams;
  const today = tanggalWIB();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? '') ? sp.from! : today.slice(0, 8) + '01';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? '') ? sp.to! : today;
  const arah = sp.arah === 'masuk' || sp.arah === 'keluar' ? sp.arah : '';
  const kategori = sp.kategori ?? '';

  const rows = await getLedger({ from, to, arah: arah || undefined, kategori: kategori || undefined, limit: 2000 });
  const masuk = rows.filter((r) => r.arah === 'masuk').reduce((a, r) => a + r.jumlah, 0);
  const keluar = rows.filter((r) => r.arah === 'keluar').reduce((a, r) => a + r.jumlah, 0);

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>📒 Transaksi</h1></div>
      <KeuanganNav />

      <form method="get" className={s.card} style={{ marginBottom: 10 }}>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--abu)' }}>Dari
            <input className={s.inp} type="date" name="from" defaultValue={from} style={{ marginLeft: 4 }} />
          </label>
          <label style={{ fontSize: 12, color: 'var(--abu)' }}>Sampai
            <input className={s.inp} type="date" name="to" defaultValue={to} style={{ marginLeft: 4 }} />
          </label>
        </div>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <select className={s.inp} name="arah" defaultValue={arah} style={{ flex: 1, minWidth: 120 }}>
            <option value="">Semua arah</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
          <select className={s.inp} name="kategori" defaultValue={kategori} style={{ flex: 1, minWidth: 140 }}>
            <option value="">Semua kategori</option>
            <optgroup label="Masuk">{KATEGORI_MASUK.map((k) => <option key={k} value={k}>{LABEL_KATEGORI[k] ?? k}</option>)}</optgroup>
            <optgroup label="Keluar">{KATEGORI_KELUAR.map((k) => <option key={k} value={k}>{LABEL_KATEGORI[k] ?? k}</option>)}</optgroup>
          </select>
          <button className={s.btn} type="submit">Cari</button>
        </div>
      </form>

      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#1c7a43' }}>{formatRupiah(masuk)}</div><div className={s.muted} style={{ fontSize: 11 }}>Kas masuk</div></div>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#c0392b' }}>{formatRupiah(keluar)}</div><div className={s.muted} style={{ fontSize: 11 }}>Kas keluar</div></div>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800, color: masuk - keluar >= 0 ? '#1c7a43' : '#c0392b' }}>{formatRupiah(masuk - keluar)}</div><div className={s.muted} style={{ fontSize: 11 }}>Selisih</div></div>
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Rincian ({rows.length})</div>
      {rows.length === 0 && <p className={s.muted}>Tidak ada transaksi pada rentang & filter ini.</p>}
      {rows.map((t) => (
        <div key={t.id} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ color: t.arah === 'masuk' ? '#1c7a43' : '#c0392b' }}>{LABEL_KATEGORI[t.kategori] ?? t.kategori}</b>
            {t.lampiran_url && <> · <a href={t.lampiran_url} target="_blank" style={{ color: 'var(--biru-d)' }}>🧾</a></>}
            <br /><small className={s.muted}>{t.tanggal}{t.keterangan ? ` · ${t.keterangan}` : ''}{t.metode ? ` · ${t.metode}` : ''}</small>
          </span>
          <span style={{ fontWeight: 800, color: t.arah === 'masuk' ? '#1c7a43' : '#c0392b' }}>{t.arah === 'masuk' ? '+' : '−'}{formatRupiah(t.jumlah)}</span>
        </div>
      ))}
    </div>
  );
}
