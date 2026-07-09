// src/app/admin/keuangan/aset/page.tsx — pencatatan aset (kategori master + upload nota WebP)
import { getAset, getKategoriAset } from '@/lib/data/keuangan';
import { simpanAset, hapusAset, tambahKategoriAset, hapusKategoriAset } from '@/lib/data/keuangan-actions';
import { formatRupiah } from '@/lib/format';
import UploadNota from '@/components/UploadNota';
import InputRupiah from '@/components/InputRupiah';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

export default async function AsetPage() {
  const [list, kategori] = await Promise.all([getAset(), getKategoriAset()]);
  const total = list.reduce((a, x) => a + (x.harga_beli || 0), 0);

  async function aksiHapus(formData: FormData) { 'use server'; await hapusAset(String(formData.get('id'))); }
  async function aksiTambahKat(formData: FormData) { 'use server'; await tambahKategoriAset(formData); }
  async function aksiHapusKat(formData: FormData) { 'use server'; await hapusKategoriAset(String(formData.get('id'))); }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🖥️ Aset</h1></div>
      <KeuanganNav />

      <div className={s.section}>Tambah Aset</div>
      <form action={simpanAset} className={s.card}>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
          <input className={s.inp} name="nama" placeholder="Nama aset (mis. Kamera Sony A7)" style={{ flex: 2, minWidth: 160 }} required />
          <select className={s.inp} name="kategori" style={{ flex: 1, minWidth: 130 }}>
            <option value="">— Kategori —</option>
            {kategori.map((k) => <option key={k.id} value={k.nama}>{k.nama}</option>)}
          </select>
        </div>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <InputRupiah className={s.inp} name="harga_beli" placeholder="Harga beli (Rp)" style={{ flex: 1, minWidth: 120, marginBottom: 0 }} />
          <input className={s.inp} type="date" name="tanggal_beli" style={{ flex: 1, minWidth: 140 }} />
          <input className={s.inp} type="number" min={0} name="umur_manfaat_bulan" placeholder="Umur manfaat (bln)" style={{ width: 150 }} />
        </div>
        <input className={s.inp} name="lokasi" placeholder="Lokasi" style={{ width: '100%', marginTop: 6 }} />
        <input className={s.inp} name="catatan" placeholder="Catatan (opsional)" style={{ width: '100%', marginTop: 6 }} />
        <div style={{ marginTop: 8 }}><UploadNota name="invoice_url" label="⬆ Upload foto nota/invoice" /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 8 }}>
          <input type="checkbox" name="catat_pengeluaran" value="1" /> Catat pembelian ini sebagai pengeluaran (kas keluar)
        </label>
        <div style={{ marginTop: 10 }}><button className={s.btn} type="submit">+ Simpan Aset</button></div>
      </form>

      <details className={s.card}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--lavender-d)', fontSize: 13 }}>⚙️ Kelola Kategori Aset ({kategori.length})</summary>
        <form action={aksiTambahKat} className={s.row} style={{ gap: 6, marginTop: 10 }}>
          <input className={s.inp} name="nama" placeholder="Kategori baru" style={{ flex: 1, marginBottom: 0 }} required />
          <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>+ Tambah</button>
        </form>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {kategori.map((k) => (
            <span key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f3f8', borderRadius: 999, padding: '4px 6px 4px 12px', fontSize: 12 }}>
              {k.nama}
              <form action={aksiHapusKat}><input type="hidden" name="id" value={k.id} /><button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c0392b', fontWeight: 800 }} title="hapus">✕</button></form>
            </span>
          ))}
        </div>
      </details>

      <div className={s.section}>Daftar Aset ({list.length}) · Total {formatRupiah(total)}</div>
      {list.length === 0 && <p className={s.muted}>Belum ada aset.</p>}
      {list.map((a) => (
        <div key={a.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{a.nama}</b>{a.kategori ? ` · ${a.kategori}` : ''}
              {a.invoice_url && <> · <a href={a.invoice_url} target="_blank" style={{ color: 'var(--biru-d)' }}>🧾 nota</a></>}
              <br /><small className={s.muted}>{formatRupiah(a.harga_beli)}{a.tanggal_beli ? ` · ${a.tanggal_beli}` : ''}{a.lokasi ? ` · ${a.lokasi}` : ''}{a.umur_manfaat_bulan ? ` · ${a.umur_manfaat_bulan} bln` : ''}</small></span>
            <form action={aksiHapus}><input type="hidden" name="id" value={a.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
