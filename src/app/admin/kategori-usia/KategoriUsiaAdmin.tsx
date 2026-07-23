// src/app/admin/kategori-usia/KategoriUsiaAdmin.tsx — CRUD master kategori usia (client)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buatKategoriUsia, updateKategoriUsia, hapusKategoriUsia } from '@/lib/data/kategori-usia-actions';
import type { KategoriUsia } from '@/lib/data/kategori-usia';
import s from '../admin.module.css';

export default function KategoriUsiaAdmin({ awal }: { awal: KategoriUsia[] }) {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [uMin, setUMin] = useState('0');
  const [uMax, setUMax] = useState('6');
  const [urutan, setUrutan] = useState(String((awal[awal.length - 1]?.urutan ?? 0) + 1));
  const [editId, setEditId] = useState<string | null>(null);
  const [eNama, setENama] = useState('');
  const [eMin, setEMin] = useState('0');
  const [eMax, setEMax] = useState('6');
  const [eUrut, setEUrut] = useState('0');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2400); }

  async function tambah() {
    if (!nama.trim()) { flash('Isi nama kategori (mis. Batita).'); return; }
    setBusy('tambah');
    const r = await buatKategoriUsia(nama, Number(uMin) || 0, Number(uMax) || 0, Number(urutan) || 0);
    setBusy(null);
    if (r.ok) { setNama(''); flash('Kategori ditambahkan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  function mulaiEdit(k: KategoriUsia) { setEditId(k.id); setENama(k.nama); setEMin(String(k.usia_min)); setEMax(String(k.usia_max)); setEUrut(String(k.urutan)); }

  async function simpanEdit(id: string) {
    setBusy(id);
    const r = await updateKategoriUsia(id, { nama: eNama, usiaMin: Number(eMin) || 0, usiaMax: Number(eMax) || 0, urutan: Number(eUrut) || 0 });
    setBusy(null);
    if (r.ok) { setEditId(null); flash('Tersimpan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  async function toggleAktif(k: KategoriUsia) {
    setBusy(k.id);
    const r = await updateKategoriUsia(k.id, { aktif: !k.aktif });
    setBusy(null);
    if (r.ok) { flash(k.aktif ? 'Dinonaktifkan (tak muncul di form) ✓' : 'Diaktifkan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  async function hapus(k: KategoriUsia) {
    if (!confirm(`Hapus kategori "${k.nama}"?\nGame yang memakainya akan lepas kategori (rentang usianya tetap tersimpan). Saran: NONAKTIFKAN saja bila masih dipakai.`)) return;
    setBusy(k.id);
    const r = await hapusKategoriUsia(k.id);
    setBusy(null);
    if (r.ok) { flash('Dihapus ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  return (
    <div>
      <div className={s.card}>
        <b>Tambah Kategori</b>
        <div className={s.row} style={{ marginTop: 8, gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className={s.inp} placeholder="Nama kategori (mis. Batita)" value={nama} onChange={(e) => setNama(e.target.value)} style={{ flex: 1, minWidth: 180, marginBottom: 0 }} />
          <span className={s.muted} style={{ fontSize: 12 }}>usia</span>
          <input className={s.inp} type="number" min={0} max={12} title="usia min" value={uMin} onChange={(e) => setUMin(e.target.value)} style={{ width: 64, marginBottom: 0 }} />
          <span className={s.muted}>–</span>
          <input className={s.inp} type="number" min={0} max={12} title="usia maks" value={uMax} onChange={(e) => setUMax(e.target.value)} style={{ width: 64, marginBottom: 0 }} />
          <input className={s.inp} type="number" title="urutan tampil" value={urutan} onChange={(e) => setUrutan(e.target.value)} style={{ width: 64, marginBottom: 0 }} />
          <button className={s.btn} onClick={tambah} disabled={busy === 'tambah'}>{busy === 'tambah' ? '...' : '+ Tambah'}</button>
        </div>
      </div>

      <div className={s.section}>Daftar kategori ({awal.length})</div>
      {awal.map((k) => (
        <div key={k.id} className={s.card} style={{ opacity: k.aktif ? 1 : 0.55 }}>
          {editId === k.id ? (
            <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className={s.inp} value={eNama} onChange={(e) => setENama(e.target.value)} style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
              <input className={s.inp} type="number" min={0} max={12} value={eMin} onChange={(e) => setEMin(e.target.value)} style={{ width: 60, marginBottom: 0 }} />
              <span className={s.muted}>–</span>
              <input className={s.inp} type="number" min={0} max={12} value={eMax} onChange={(e) => setEMax(e.target.value)} style={{ width: 60, marginBottom: 0 }} />
              <input className={s.inp} type="number" title="urutan" value={eUrut} onChange={(e) => setEUrut(e.target.value)} style={{ width: 60, marginBottom: 0 }} />
              <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} onClick={() => simpanEdit(k.id)} disabled={busy === k.id}>Simpan</button>
              <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => setEditId(null)}>Batal</button>
            </div>
          ) : (
            <div className={s.row} style={{ alignItems: 'center' }}>
              <span style={{ flex: 1 }}>
                <b>{k.nama}</b> <span className={s.muted}>({k.usia_min}–{k.usia_max} th)</span> {!k.aktif && <span className={`${s.tag} ${s.tagDraf}`}>nonaktif</span>}
                <br /><small className={s.muted}>urutan {k.urutan}</small>
              </span>
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => mulaiEdit(k)} disabled={busy === k.id}>Edit</button>
                <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggleAktif(k)} disabled={busy === k.id}>{k.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
                <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(k)} disabled={busy === k.id}>Hapus</button>
              </span>
            </div>
          )}
        </div>
      ))}
      {awal.length === 0 && <p className={s.muted}>Belum ada kategori — jalankan migrasi 0079 (seed) atau tambah manual.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
