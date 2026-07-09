// src/app/admin/keuangan/expense/page.tsx — input & daftar pengeluaran
import { getLedger, KATEGORI_KELUAR, LABEL_KATEGORI } from '@/lib/data/keuangan';
import { catatPengeluaran, hapusTransaksi } from '@/lib/data/keuangan-actions';
import { formatRupiah } from '@/lib/format';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

export default async function ExpensePage() {
  const list = await getLedger({ arah: 'keluar', limit: 300 });

  async function aksiHapus(formData: FormData) {
    'use server';
    await hapusTransaksi(String(formData.get('id')));
  }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💸 Pengeluaran</h1></div>
      <KeuanganNav />

      <div className={s.section}>Catat Pengeluaran</div>
      <form action={catatPengeluaran} className={s.card}>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
          <input className={s.inp} type="date" name="tanggal" style={{ flex: 1, minWidth: 140 }} required />
          <select className={s.inp} name="kategori" style={{ flex: 1, minWidth: 140 }}>
            {KATEGORI_KELUAR.map((k) => <option key={k} value={k}>{LABEL_KATEGORI[k] ?? k}</option>)}
          </select>
          <input className={s.inp} type="number" min={0} name="jumlah" placeholder="Nominal (Rp)" style={{ flex: 1, minWidth: 120 }} required />
        </div>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <input className={s.inp} name="keterangan" placeholder="Keterangan / vendor" style={{ flex: 2, minWidth: 160 }} />
          <input className={s.inp} name="metode" placeholder="Metode (transfer/cash)" style={{ flex: 1, minWidth: 120 }} />
          <input className={s.inp} name="pic" placeholder="PIC" style={{ width: 110 }} />
        </div>
        <input className={s.inp} name="lampiran_url" placeholder="URL lampiran/bukti (opsional)" style={{ width: '100%', marginTop: 6 }} />
        <div style={{ marginTop: 10 }}><button className={s.btn} type="submit">+ Catat</button></div>
      </form>

      <div className={s.section}>Riwayat Pengeluaran ({list.length})</div>
      {list.length === 0 && <p className={s.muted}>Belum ada pengeluaran.</p>}
      {list.map((t) => (
        <div key={t.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{LABEL_KATEGORI[t.kategori] ?? t.kategori}</b> · <span style={{ color: '#c0392b', fontWeight: 700 }}>{formatRupiah(t.jumlah)}</span>
              <br /><small className={s.muted}>{t.tanggal}{t.keterangan ? ` · ${t.keterangan}` : ''}{t.metode ? ` · ${t.metode}` : ''}</small></span>
            <form action={aksiHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
