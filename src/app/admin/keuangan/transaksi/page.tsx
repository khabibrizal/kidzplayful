// src/app/admin/keuangan/transaksi/page.tsx — Ledger + Cash Flow + filter rentang tanggal & kategori
import Link from 'next/link';
import { getLedger, getKategoriPengeluaran, LABEL_KATEGORI, KATEGORI_MASUK } from '@/lib/data/keuangan';
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

  const [rows, katKeluar] = await Promise.all([
    getLedger({ from, to, arah: arah || undefined, kategori: kategori || undefined, limit: 2000 }),
    getKategoriPengeluaran(),
  ]);
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
            <optgroup label="Keluar">{katKeluar.map((k) => <option key={k.id} value={k.kode}>{k.nama}</option>)}</optgroup>
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
      {rows.map((t) => {
        const bisa = !!t.id; // semua transaksi punya halaman detail
        const isi = (
          <>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ color: t.arah === 'masuk' ? '#1c7a43' : '#c0392b' }}>{LABEL_KATEGORI[t.kategori] ?? t.kategori}</b>
              {bisa && <span className={s.muted} style={{ fontSize: 12 }}> · lihat detail ›</span>}
              <br /><small className={s.muted}>{t.tanggal}{t.keterangan ? ` · ${t.keterangan}` : ''}{t.metode ? ` · ${t.metode}` : ''}</small>
            </span>
            <span style={{ fontWeight: 800, color: t.arah === 'masuk' ? '#1c7a43' : '#c0392b' }}>{t.arah === 'masuk' ? '+' : '−'}{formatRupiah(t.jumlah)}</span>
          </>
        );
        const style = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' } as const;
        return bisa
          ? <Link key={t.id} href={`/admin/keuangan/transaksi/${t.id}`} className={s.card} style={{ ...style, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>{isi}</Link>
          : <div key={t.id} className={s.card} style={style}>{isi}</div>;
      })}
    </div>
  );
}
