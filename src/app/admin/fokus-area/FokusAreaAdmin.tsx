// src/app/admin/fokus-area/FokusAreaAdmin.tsx — CRUD master fokus area (client)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buatFokusArea, updateFokusArea, hapusFokusArea } from '@/lib/data/fokus-area-actions';
import type { FokusArea } from '@/lib/data/fokus-area';
import s from '../admin.module.css';

export default function FokusAreaAdmin({ awal }: { awal: FokusArea[] }) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [urutan, setUrutan] = useState(String((awal[awal.length - 1]?.urutan ?? 0) + 1));
  const [editId, setEditId] = useState<string | null>(null);
  const [eLabel, setELabel] = useState('');
  const [eUrutan, setEUrutan] = useState('0');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2400); }

  async function tambah() {
    if (!label.trim()) { flash('Isi label area (boleh ber-emoji, mis. 🎵 Musik & Irama).'); return; }
    setBusy('tambah');
    const r = await buatFokusArea(label, Number(urutan) || 0);
    setBusy(null);
    if (r.ok) { setLabel(''); flash('Area ditambahkan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  function mulaiEdit(a: FokusArea) { setEditId(a.id); setELabel(a.label); setEUrutan(String(a.urutan)); }

  async function simpanEdit(id: string) {
    setBusy(id);
    const r = await updateFokusArea(id, { label: eLabel, urutan: Number(eUrutan) || 0 });
    setBusy(null);
    if (r.ok) { setEditId(null); flash('Tersimpan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  async function toggleAktif(a: FokusArea) {
    setBusy(a.id);
    const r = await updateFokusArea(a.id, { aktif: !a.aktif });
    setBusy(null);
    if (r.ok) { flash(a.aktif ? 'Dinonaktifkan (tak muncul di form) ✓' : 'Diaktifkan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  async function hapus(a: FokusArea) {
    if (!confirm(`Hapus area "${a.label}"?\nKelas lama yang memakai area ini akan menampilkan key mentah "${a.key}". Sarannya: NONAKTIFKAN saja bila masih dipakai.`)) return;
    setBusy(a.id);
    const r = await hapusFokusArea(a.id);
    setBusy(null);
    if (r.ok) { flash('Dihapus ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  return (
    <div>
      <div className={s.card}>
        <b>Tambah Area</b>
        <div className={s.row} style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
          <input className={s.inp} placeholder="Label (mis. 🎵 Musik & Irama)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: 1, minWidth: 200, marginBottom: 0 }} />
          <input className={s.inp} type="number" placeholder="urutan" title="Urutan tampil" value={urutan} onChange={(e) => setUrutan(e.target.value)} style={{ width: 80, marginBottom: 0 }} />
          <button className={s.btn} onClick={tambah} disabled={busy === 'tambah'}>{busy === 'tambah' ? '...' : '+ Tambah'}</button>
        </div>
        <p className={s.muted} style={{ fontSize: 11, marginTop: 6 }}>Key otomatis dibuat dari label (tanpa emoji), mis. "🎵 Musik & Irama" → <code>musik-irama</code>.</p>
      </div>

      <div className={s.section}>Daftar area ({awal.length})</div>
      {awal.map((a) => (
        <div key={a.id} className={s.card} style={{ opacity: a.aktif ? 1 : 0.55 }}>
          {editId === a.id ? (
            <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className={s.inp} value={eLabel} onChange={(e) => setELabel(e.target.value)} style={{ flex: 1, minWidth: 180, marginBottom: 0 }} />
              <input className={s.inp} type="number" value={eUrutan} onChange={(e) => setEUrutan(e.target.value)} style={{ width: 72, marginBottom: 0 }} />
              <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} onClick={() => simpanEdit(a.id)} disabled={busy === a.id}>Simpan</button>
              <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => setEditId(null)}>Batal</button>
            </div>
          ) : (
            <div className={s.row} style={{ alignItems: 'center' }}>
              <span style={{ flex: 1 }}>
                <b>{a.label}</b> {!a.aktif && <span className={`${s.tag} ${s.tagDraf}`}>nonaktif</span>}
                <br /><small className={s.muted}>key: <code>{a.key}</code> · urutan {a.urutan}</small>
              </span>
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => mulaiEdit(a)} disabled={busy === a.id}>Edit</button>
                <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggleAktif(a)} disabled={busy === a.id}>{a.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
                <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(a)} disabled={busy === a.id}>Hapus</button>
              </span>
            </div>
          )}
        </div>
      ))}
      {awal.length === 0 && <p className={s.muted}>Belum ada area — jalankan migrasi 0078 (seed 8 area bawaan) atau tambah manual.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
