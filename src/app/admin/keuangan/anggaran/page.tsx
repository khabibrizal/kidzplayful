// src/app/admin/keuangan/anggaran/page.tsx — Budget vs Realisasi + Forecast (Fase 2C)
import { getAnggaranBulan, getForecast } from '@/lib/data/anggaran';
import { simpanAnggaran } from '@/lib/data/anggaran-actions';
import { KATEGORI_KELUAR, LABEL_KATEGORI } from '@/lib/data/keuangan';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { formatRupiah } from '@/lib/format';
import InputRupiah from '@/components/InputRupiah';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

function labelBulan(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default async function AnggaranPage({ searchParams }: { searchParams: Promise<{ ym?: string }> }) {
  const sp = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(sp.ym ?? '') ? sp.ym! : tanggalWIB().slice(0, 7);
  const [ab, fc] = await Promise.all([getAnggaranBulan(ym), getForecast(6)]);

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎯 Anggaran & Proyeksi</h1></div>
      <KeuanganNav />

      {/* Pilih bulan */}
      <form method="get" className={s.card} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--abu)' }}>Periode
          <input className={s.inp} type="month" name="ym" defaultValue={ym} style={{ marginLeft: 6 }} />
        </label>
        <button className={s.btnSm} type="submit" style={{ background: 'var(--lavender-d)', color: '#fff' }}>Lihat</button>
      </form>

      {/* Set anggaran */}
      <div className={s.section}>Atur Anggaran — {labelBulan(ym)}</div>
      <form action={simpanAnggaran} className={s.card}>
        <input type="hidden" name="ym" value={ym} />
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
          <select className={s.inp} name="kategori" style={{ flex: 1, minWidth: 150 }} required>
            <option value="">— Kategori pengeluaran —</option>
            {KATEGORI_KELUAR.map((k) => <option key={k} value={k}>{LABEL_KATEGORI[k] ?? k}</option>)}
          </select>
          <InputRupiah className={s.inp} name="jumlah" placeholder="Anggaran (Rp)" style={{ flex: 1, minWidth: 130, marginBottom: 0 }} />
          <button className={s.btn} type="submit">Simpan</button>
        </div>
        <p className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>Menyimpan kategori yang sama akan menimpa anggaran bulan ini. Isi 0 untuk menghapus.</p>
      </form>

      {/* Realisasi vs Anggaran */}
      <div className={s.section}>Realisasi vs Anggaran — {labelBulan(ym)}</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800 }}>{formatRupiah(ab.totalAnggaran)}</div><div className={s.muted} style={{ fontSize: 11 }}>Total anggaran</div></div>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#c0392b' }}>{formatRupiah(ab.totalRealisasi)}</div><div className={s.muted} style={{ fontSize: 11 }}>Total realisasi</div></div>
        <div className={s.card} style={{ flex: 1, minWidth: 110, textAlign: 'center' }}><div style={{ fontWeight: 800, color: ab.totalAnggaran - ab.totalRealisasi >= 0 ? '#1c7a43' : '#c0392b' }}>{formatRupiah(ab.totalAnggaran - ab.totalRealisasi)}</div><div className={s.muted} style={{ fontSize: 11 }}>Sisa</div></div>
      </div>
      {ab.rows.length === 0 && <p className={s.muted}>Belum ada anggaran maupun pengeluaran pada bulan ini.</p>}
      {ab.rows.map((r) => {
        const over = r.anggaran > 0 && r.realisasi > r.anggaran;
        const pakai = r.persenPakai ?? 0;
        return (
          <div key={r.kategori} className={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
              <b>{LABEL_KATEGORI[r.kategori] ?? r.kategori}</b>
              <span>{formatRupiah(r.realisasi)} <span className={s.muted}>/ {r.anggaran > 0 ? formatRupiah(r.anggaran) : 'tanpa anggaran'}</span></span>
            </div>
            {r.anggaran > 0 && (
              <>
                <div style={{ background: '#f0f0f5', borderRadius: 6, height: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, pakai)}%`, height: '100%', background: over ? '#c0392b' : pakai >= 85 ? '#e67e22' : '#1c9c6b' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                  <span className={s.muted}>{pakai}% terpakai</span>
                  <span style={{ color: r.selisih >= 0 ? '#1c7a43' : '#c0392b', fontWeight: 700 }}>{r.selisih >= 0 ? `sisa ${formatRupiah(r.selisih)}` : `lebih ${formatRupiah(-r.selisih)}`}</span>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Forecast */}
      <div className={s.section} style={{ marginTop: 14 }}>Proyeksi 6 Bulan ke Depan</div>
      <p className={s.muted} style={{ fontSize: 12, marginTop: -4 }}>
        Asumsi: pendapatan ≈ rata-rata 3 bulan terakhir ({formatRupiah(fc.basis.avgRevenue)}/bln), pengeluaran ≈ rata-rata 3 bulan ({formatRupiah(fc.basis.avgExpense)}/bln) atau anggaran bila diisi. Saldo awal {formatRupiah(fc.saldoSekarang)}.
      </p>
      <div className={s.card} style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 460 }}>
          <thead>
            <tr style={{ textAlign: 'right', color: 'var(--abu)' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Bulan</th>
              <th style={{ padding: '6px 4px' }}>Pendapatan</th>
              <th style={{ padding: '6px 4px' }}>Pengeluaran</th>
              <th style={{ padding: '6px 4px' }}>Net</th>
              <th style={{ padding: '6px 4px' }}>Saldo proyeksi</th>
            </tr>
          </thead>
          <tbody>
            {fc.rows.map((r) => (
              <tr key={r.ym} style={{ textAlign: 'right', borderTop: '1px solid #f0f0f5' }}>
                <td style={{ textAlign: 'left', padding: '6px 4px' }}>{r.label}{r.anggaranAda && <span className={s.muted} style={{ fontSize: 10 }}> · anggaran</span>}</td>
                <td style={{ padding: '6px 4px', color: '#1c7a43' }}>{formatRupiah(r.revenue)}</td>
                <td style={{ padding: '6px 4px', color: '#c0392b' }}>{formatRupiah(r.expense)}</td>
                <td style={{ padding: '6px 4px', color: r.net >= 0 ? '#1c7a43' : '#c0392b', fontWeight: 700 }}>{formatRupiah(r.net)}</td>
                <td style={{ padding: '6px 4px', fontWeight: 800, color: r.saldoProyeksi >= 0 ? 'var(--lavender-d)' : '#c0392b' }}>{formatRupiah(r.saldoProyeksi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fc.rows.some((r) => r.saldoProyeksi < 0) && (
        <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>⚠️ Saldo diproyeksikan menjadi negatif — perhatikan arus kas / kurangi pengeluaran.</p>
      )}
    </div>
  );
}
