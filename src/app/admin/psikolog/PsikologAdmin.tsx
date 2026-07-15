// src/app/admin/psikolog/PsikologAdmin.tsx
'use client';
import { useState } from 'react';
import { jadikanPsikolog, cabutPsikolog } from '@/lib/data/admin-psikolog-actions';
import type { PsikologRow } from '@/lib/data/admin-psikolog';
import s from '../admin.module.css';

export default function PsikologAdmin({ awal }: { awal: PsikologRow[] }) {
  const [list, setList] = useState<PsikologRow[]>(awal);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2600); }

  async function tambah() {
    if (!email.trim()) { flash('Isi email psikolog.'); return; }
    setLoading(true);
    try { await jadikanPsikolog(email); flash('Psikolog diaktifkan ✓ (segarkan halaman untuk melihat daftar)'); setEmail(''); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }
  async function cabut(p: PsikologRow) {
    if (!confirm(`Cabut akses psikolog untuk ${p.email}?`)) return;
    setBusyId(p.id);
    try { await cabutPsikolog(p.id); setList(list.filter((x) => x.id !== p.id)); flash('Akses psikolog dicabut ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className={s.card}>
        <b>Aktifkan Psikolog</b>
        <div className={s.row} style={{ marginTop: 8, gap: 6 }}>
          <input className={s.inp} type="email" placeholder="email psikolog (yang sudah daftar)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
          <button className={s.btn} onClick={tambah} disabled={loading}>{loading ? '...' : '+ Jadikan Psikolog'}</button>
        </div>
      </div>

      <div className={s.section}>Psikolog aktif ({list.length})</div>
      {list.length === 0 && <p className={s.muted}>Belum ada psikolog.</p>}
      {list.map((p) => (
        <div key={p.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{p.nama_tampilan || '(tanpa nama)'}</b><br /><small className={s.muted}>{p.email}</small></span>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => cabut(p)} disabled={busyId === p.id}>Cabut</button>
          </div>
        </div>
      ))}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
