// src/app/admin/keuangan/master/page.tsx — Master kategori (Aset & Pengeluaran)
import { getKategoriAset, getKategoriPengeluaran } from '@/lib/data/keuangan';
import { tambahKategoriAset, hapusKategoriAset, tambahKategoriPengeluaran, hapusKategoriPengeluaran } from '@/lib/data/keuangan-actions';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

export default async function MasterPage() {
  const [katAset, katPeng] = await Promise.all([getKategoriAset(), getKategoriPengeluaran()]);

  async function hapusAset(formData: FormData) { 'use server'; await hapusKategoriAset(String(formData.get('id'))); }
  async function hapusPeng(formData: FormData) { 'use server'; await hapusKategoriPengeluaran(String(formData.get('id'))); }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>⚙️ Master Kategori</h1></div>
      <KeuanganNav />
      <p className={s.muted} style={{ fontSize: 12 }}>Kelola daftar kategori yang dipakai di form Pengeluaran, Aset, dan Anggaran.</p>

      {/* Kategori Pengeluaran */}
      <div className={s.section}>💸 Kategori Pengeluaran ({katPeng.length})</div>
      <form action={tambahKategoriPengeluaran} className={s.card} style={{ display: 'flex', gap: 6 }}>
        <input className={s.inp} name="nama" placeholder="Kategori pengeluaran baru (mis. Sewa Tempat)" style={{ flex: 1, marginBottom: 0 }} required />
        <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>+ Tambah</button>
      </form>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {katPeng.map((k) => (
          <span key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: k.bawaan ? '#eef1f6' : '#f3f3f8', borderRadius: 999, padding: '4px 6px 4px 12px', fontSize: 12 }}>
            {k.nama}{k.bawaan && <span className={s.muted} style={{ fontSize: 10 }}>bawaan</span>}
            {!k.bawaan && (
              <form action={hapusPeng}><input type="hidden" name="id" value={k.id} /><button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c0392b', fontWeight: 800 }} title="hapus">✕</button></form>
            )}
          </span>
        ))}
      </div>
      <p className={s.muted} style={{ fontSize: 11, marginTop: 6 }}>Kategori bawaan sistem tidak dapat dihapus (dipakai untuk perhitungan CAC, aset, & pajak).</p>

      {/* Kategori Aset */}
      <div className={s.section} style={{ marginTop: 16 }}>🖥️ Kategori Aset ({katAset.length})</div>
      <form action={tambahKategoriAset} className={s.card} style={{ display: 'flex', gap: 6 }}>
        <input className={s.inp} name="nama" placeholder="Kategori aset baru (mis. Kamera)" style={{ flex: 1, marginBottom: 0 }} required />
        <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>+ Tambah</button>
      </form>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {katAset.length === 0 && <p className={s.muted}>Belum ada kategori aset.</p>}
        {katAset.map((k) => (
          <span key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f3f8', borderRadius: 999, padding: '4px 6px 4px 12px', fontSize: 12 }}>
            {k.nama}
            <form action={hapusAset}><input type="hidden" name="id" value={k.id} /><button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c0392b', fontWeight: 800 }} title="hapus">✕</button></form>
          </span>
        ))}
      </div>
    </div>
  );
}
