// src/app/admin/keuangan/expense/page.tsx — input & daftar pengeluaran
import Link from 'next/link';
import { getLedger, getKategoriPengeluaran, LABEL_KATEGORI, METODE_BAYAR } from '@/lib/data/keuangan';
import { catatPengeluaran, hapusTransaksi } from '@/lib/data/keuangan-actions';
import { formatRupiah } from '@/lib/format';
import UploadNota from '@/components/UploadNota';
import InputRupiah from '@/components/InputRupiah';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

export default async function ExpensePage() {
  const [list, kategori] = await Promise.all([getLedger({ arah: 'keluar', limit: 300 }), getKategoriPengeluaran()]);

  async function aksiHapus(formData: FormData) {
    'use server';
    await hapusTransaksi(String(formData.get('id')));
  }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💸 Pengeluaran</h1></div>
      <KeuanganNav />

      <div className={s.section} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Catat Pengeluaran <Link href="/admin/keuangan/master" className={s.muted} style={{ fontSize: 12, fontWeight: 600 }}>⚙️ Kelola kategori</Link></div>
      <form action={catatPengeluaran} className={s.card}>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
          <input className={s.inp} type="date" name="tanggal" style={{ flex: 1, minWidth: 140 }} required />
          <select className={s.inp} name="kategori" style={{ flex: 1, minWidth: 140 }}>
            {kategori.map((k) => <option key={k.id} value={k.kode}>{k.nama}</option>)}
          </select>
          <InputRupiah className={s.inp} name="jumlah" placeholder="Nominal (Rp)" style={{ flex: 1, minWidth: 120, marginBottom: 0 }} />
        </div>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <input className={s.inp} name="keterangan" placeholder="Keterangan / vendor" style={{ flex: 2, minWidth: 160 }} />
          <select className={s.inp} name="metode" style={{ flex: 1, minWidth: 130 }} defaultValue="transfer">
            {METODE_BAYAR.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <input className={s.inp} name="pic" placeholder="PIC" style={{ width: 110 }} />
        </div>
        <div style={{ marginTop: 8 }}><UploadNota name="lampiran_url" label="⬆ Upload foto nota" /></div>
        <div style={{ marginTop: 10 }}><button className={s.btn} type="submit">+ Catat</button></div>
      </form>

      <div className={s.section}>Riwayat Pengeluaran ({list.length})</div>
      {list.length === 0 && <p className={s.muted}>Belum ada pengeluaran.</p>}
      {list.map((t) => (
        <div key={t.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{LABEL_KATEGORI[t.kategori] ?? t.kategori}</b> · <span style={{ color: '#c0392b', fontWeight: 700 }}>{formatRupiah(t.jumlah)}</span>
              {t.lampiran_url && <> · <a href={t.lampiran_url} target="_blank" style={{ color: 'var(--biru-d)' }}>🧾 nota</a></>}
              <br /><small className={s.muted}>{t.tanggal}{t.keterangan ? ` · ${t.keterangan}` : ''}{t.metode ? ` · ${t.metode}` : ''}</small></span>
            <form action={aksiHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
