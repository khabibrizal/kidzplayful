// src/app/psikolog/SesiActions.tsx — tombol Terima/Tolak/Selesai pendaftaran konsultasi
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setStatusKonsultasi } from '@/lib/data/psikolog-actions';
import type { StatusKonsultasi } from '@/lib/game/tipe';

export default function SesiActions({ id, mode }: { id: string; mode: 'menunggu' | 'aktif' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function ubah(status: StatusKonsultasi) {
    setBusy(true); setMsg('');
    const r = await setStatusKonsultasi(id, status);
    setBusy(false);
    if (r.ok) router.refresh();
    else setMsg(r.error ?? 'Gagal');
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {mode === 'menunggu' ? (
        <>
          <button className="kp-btn mint" onClick={() => ubah('diterima')} disabled={busy} style={{ padding: '6px 14px', fontSize: 13 }}>Terima</button>
          <button className="kp-btn putih" onClick={() => ubah('ditolak')} disabled={busy} style={{ padding: '6px 14px', fontSize: 13 }}>Tolak</button>
        </>
      ) : (
        <button className="kp-btn putih" onClick={() => ubah('selesai')} disabled={busy} style={{ padding: '6px 14px', fontSize: 13 }}>Tandai selesai</button>
      )}
      {msg && <span style={{ fontSize: 12, color: '#c0392b' }}>{msg}</span>}
    </div>
  );
}
