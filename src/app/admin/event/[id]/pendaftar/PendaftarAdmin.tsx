// src/app/admin/event/[id]/pendaftar/PendaftarAdmin.tsx
'use client';
import { useState } from 'react';
import { setStatusPendaftaran } from '@/lib/data/admin-event-actions';
import type { PendaftaranEvent } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import s from '../../../admin.module.css';

const WARNA: Record<string, string> = { menunggu: '#b88600', diterima: '#1c7a43', ditolak: '#b3261e' };

export default function PendaftarAdmin({ awal }: { awal: PendaftaranEvent[] }) {
  const [list, setList] = useState<PendaftaranEvent[]>(awal);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2000); }

  async function ubah(p: PendaftaranEvent, status: 'diterima' | 'ditolak') {
    setBusyId(p.id);
    try {
      await setStatusPendaftaran(p.id, status);
      setList(list.map((x) => (x.id === p.id ? { ...x, status } : x)));
      flash(status === 'diterima' ? 'Diterima ✓' : 'Ditolak');
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  if (list.length === 0) return <p className={s.muted}>Belum ada pendaftar.</p>;

  return (
    <div>
      {list.map((p) => (
        <div key={p.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}>
              <b>{p.anak_nama.join(', ') || `${p.jumlah_anak} anak`}</b>
              <br /><small className={s.muted}>{p.jumlah_anak} anak · {formatRupiah(p.total)}</small>
            </span>
            <span className={s.tag} style={{ background: '#f3f0fb', color: WARNA[p.status] }}>{p.status}</span>
          </div>
          <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {p.bukti_url
              ? <a className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} href={p.bukti_url} target="_blank">📎 Bukti bayar</a>
              : <span className={s.muted}>tanpa bukti</span>}
            <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} onClick={() => ubah(p, 'diterima')} disabled={busyId === p.id || p.status === 'diterima'}>Terima</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => ubah(p, 'ditolak')} disabled={busyId === p.id || p.status === 'ditolak'}>Tolak</button>
          </div>
        </div>
      ))}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
