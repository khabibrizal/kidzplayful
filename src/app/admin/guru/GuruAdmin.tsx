// src/app/admin/guru/GuruAdmin.tsx
'use client';
import { useState } from 'react';
import { jadikanGuru, cabutGuru } from '@/lib/data/admin-guru-actions';
import type { GuruRow } from '@/lib/data/admin-guru';
import s from '../admin.module.css';

export default function GuruAdmin({ awal }: { awal: GuruRow[] }) {
  const [list, setList] = useState<GuruRow[]>(awal);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2600); }

  async function tambah() {
    if (!email.trim()) { flash('Isi email guru.'); return; }
    setLoading(true);
    try { await jadikanGuru(email); flash('Guru diaktifkan ✓ (segarkan halaman untuk melihat daftar)'); setEmail(''); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }
  async function cabut(g: GuruRow) {
    if (!confirm(`Cabut akses guru untuk ${g.email}?`)) return;
    setBusyId(g.id);
    try { await cabutGuru(g.id); setList(list.filter((x) => x.id !== g.id)); flash('Akses guru dicabut ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className={s.card}>
        <b>Aktifkan Guru</b>
        <div className={s.row} style={{ marginTop: 8, gap: 6 }}>
          <input className={s.inp} type="email" placeholder="email guru (yang sudah daftar)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
          <button className={s.btn} onClick={tambah} disabled={loading}>{loading ? '...' : '+ Jadikan Guru'}</button>
        </div>
      </div>

      <div className={s.section}>Guru aktif ({list.length})</div>
      {list.length === 0 && <p className={s.muted}>Belum ada guru.</p>}
      {list.map((g) => (
        <div key={g.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{g.nama_tampilan || '(tanpa nama)'}</b><br /><small className={s.muted}>{g.email}</small></span>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => cabut(g)} disabled={busyId === g.id}>Cabut</button>
          </div>
        </div>
      ))}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
