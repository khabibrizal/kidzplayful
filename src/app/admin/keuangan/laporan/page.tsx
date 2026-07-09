// src/app/admin/keuangan/laporan/page.tsx — Laporan keuangan (P&L, per bulan, per kategori) + ekspor
import Link from 'next/link';
import { getPerBulan, getPerKategori, LABEL_KATEGORI } from '@/lib/data/keuangan';
import { formatRupiah } from '@/lib/format';
import KeuanganNav from '../KeuanganNav';
import EksporCsvBtn from '../EksporCsvBtn';
import s from '../../admin.module.css';

export default async function LaporanKeuanganPage() {
  const [perBulan, masukKat, keluarKat] = await Promise.all([
    getPerBulan(6), getPerKategori('masuk'), getPerKategori('keluar'),
  ]);
  const totalMasuk = masukKat.reduce((a, x) => a + x.total, 0);
  const totalKeluar = keluarKat.reduce((a, x) => a + x.total, 0);
  const laba = totalMasuk - totalKeluar;

  const baris: (string | number)[][] = [
    ['Laporan Keuangan KidzPlayful'], [],
    ['Ringkasan (akumulasi)'],
    ['Total Pendapatan', totalMasuk],
    ['Total Pengeluaran', totalKeluar],
    ['Laba/Rugi', laba], [],
    ['Per Bulan', 'Masuk', 'Keluar', 'Net'],
    ...perBulan.map((b) => [b.label, b.masuk, b.keluar, b.masuk - b.keluar]), [],
    ['Pendapatan per kategori'], ...masukKat.map((k) => [LABEL_KATEGORI[k.kategori] ?? k.kategori, k.total]), [],
    ['Pengeluaran per kategori'], ...keluarKat.map((k) => [LABEL_KATEGORI[k.kategori] ?? k.kategori, k.total]),
  ];

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>📈 Laporan</h1></div>
      <KeuanganNav />

      <div className={s.row} style={{ justifyContent: 'flex-end', marginBottom: 8 }}><EksporCsvBtn nama="laporan-keuangan-kidzplayful.csv" baris={baris} /></div>

      <div className={s.section}>Laba-Rugi (akumulasi)</div>
      <div className={s.card}>
        <div className={s.row} style={{ justifyContent: 'space-between' }}><span>Total Pendapatan</span><b style={{ color: '#1c7a43' }}>{formatRupiah(totalMasuk)}</b></div>
        <div className={s.row} style={{ justifyContent: 'space-between', marginTop: 4 }}><span>Total Pengeluaran</span><b style={{ color: '#c0392b' }}>−{formatRupiah(totalKeluar)}</b></div>
        <div className={s.row} style={{ justifyContent: 'space-between', borderTop: '1px dashed #e2dbf0', marginTop: 8, paddingTop: 8, fontSize: 16 }}><b>Laba / Rugi</b><b style={{ color: laba >= 0 ? '#1c7a43' : '#c0392b' }}>{formatRupiah(laba)}</b></div>
      </div>

      <div className={s.section} style={{ marginTop: 14 }}>Per Bulan (6 bulan)</div>
      {perBulan.map((b) => (
        <div key={b.ym} className={s.card} style={{ padding: '10px 14px' }}>
          <div className={s.row} style={{ justifyContent: 'space-between' }}><b>{b.label}</b><span style={{ fontWeight: 800, color: b.masuk - b.keluar >= 0 ? '#1c7a43' : '#c0392b' }}>{formatRupiah(b.masuk - b.keluar)}</span></div>
          <small className={s.muted}>Masuk {formatRupiah(b.masuk)} · Keluar {formatRupiah(b.keluar)}</small>
        </div>
      ))}

      <div className={s.section} style={{ marginTop: 14 }}>Pendapatan per Kategori <span className={s.muted} style={{ fontWeight: 400 }}>(klik untuk detail per tanggal)</span></div>
      {masukKat.length === 0 ? <p className={s.muted}>—</p> : masukKat.map((k) => (
        <Link key={k.kategori} href={`/admin/keuangan/transaksi?arah=masuk&kategori=${k.kategori}&from=2020-01-01`} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', textDecoration: 'none', color: 'inherit' }}><b>{LABEL_KATEGORI[k.kategori] ?? k.kategori} ›</b><span style={{ color: '#1c7a43', fontWeight: 700 }}>{formatRupiah(k.total)}</span></Link>
      ))}

      <div className={s.section} style={{ marginTop: 14 }}>Pengeluaran per Kategori <span className={s.muted} style={{ fontWeight: 400 }}>(klik untuk detail per tanggal)</span></div>
      {keluarKat.length === 0 ? <p className={s.muted}>—</p> : keluarKat.map((k) => (
        <Link key={k.kategori} href={`/admin/keuangan/transaksi?arah=keluar&kategori=${k.kategori}&from=2020-01-01`} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', textDecoration: 'none', color: 'inherit' }}><b>{LABEL_KATEGORI[k.kategori] ?? k.kategori} ›</b><span style={{ color: '#c0392b', fontWeight: 700 }}>{formatRupiah(k.total)}</span></Link>
      ))}

      <p className={s.muted} style={{ fontSize: 11, marginTop: 12 }}>Tip: untuk PDF, gunakan Cetak browser (Ctrl/Cmd+P → Simpan sebagai PDF). Ekspor CSV bisa dibuka di Excel/Sheets.</p>
    </div>
  );
}
