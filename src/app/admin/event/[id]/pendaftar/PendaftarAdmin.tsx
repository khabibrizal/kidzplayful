// src/app/admin/event/[id]/pendaftar/PendaftarAdmin.tsx
'use client';
import { useState } from 'react';
import { setStatusPendaftaran, setKehadiran } from '@/lib/data/admin-event-actions';
import type { PendaftaranEvent } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import s from '../../../admin.module.css';

const WARNA: Record<string, string> = { menunggu: '#b88600', diterima: '#1c7a43', ditolak: '#b3261e' };

export default function PendaftarAdmin({ awal, sertMap }: { awal: PendaftaranEvent[]; sertMap: Record<string, string> }) {
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

  async function absen(p: PendaftaranEvent, anakId: string, hadir: boolean) {
    const key = `${p.id}:${anakId}`;
    setBusyId(key);
    try {
      const baru = await setKehadiran(p.id, anakId, hadir);
      setList(list.map((x) => (x.id === p.id ? { ...x, hadir_anak_ids: baru } : x)));
      flash(hadir ? 'Ditandai hadir ✓' : 'Batal hadir');
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

          {p.status === 'diterima' && (
            <div style={{ marginTop: 8, borderTop: '1px dashed #e6e0f2', paddingTop: 8 }}>
              <div className={s.muted} style={{ fontSize: 12, marginBottom: 6 }}>Absensi kehadiran (untuk e-sertifikat):</div>
              <div className={s.row} style={{ flexWrap: 'wrap', gap: 6 }}>
                {p.anak_ids.map((anakId, i) => {
                  const hadir = p.hadir_anak_ids.includes(anakId);
                  const key = `${p.id}:${anakId}`;
                  return (
                    <button
                      key={anakId}
                      className={s.btnSm}
                      style={hadir
                        ? { background: '#1c7a43', color: '#fff' }
                        : { background: '#f3f0fb', color: 'var(--abu)' }}
                      onClick={() => absen(p, anakId, !hadir)}
                      disabled={busyId === key}
                    >
                      {busyId === key ? '...' : `${hadir ? '✓ ' : ''}${p.anak_nama[i] ?? 'Anak'}`}
                    </button>
                  );
                })}
              </div>
              {p.anak_ids.some((id) => sertMap[id]) && (
                <div className={s.row} style={{ flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  <span className={s.muted} style={{ fontSize: 12 }}>E-sertifikat:</span>
                  {p.anak_ids.map((anakId, i) => sertMap[anakId]
                    ? <a key={anakId} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} href={`/sertifikat/${sertMap[anakId]}`} target="_blank" rel="noopener noreferrer">⬇ {p.anak_nama[i] ?? 'Anak'}</a>
                    : null)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
