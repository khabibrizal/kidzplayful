// src/app/komunitas/Compose.tsx
'use client';
import { useState } from 'react';
import { buatPostingan } from '@/lib/data/komunitas-actions';

export default function Compose({ tema, temaAwal }: { tema: { id: string; nama: string }[]; temaAwal?: string }) {
  const [teks, setTeks] = useState('');
  const [temaId, setTemaId] = useState(temaAwal ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function kirim() {
    setErr('');
    if (!teks.trim()) { setErr('Tulis ceritamu dulu ya.'); return; }
    setLoading(true);
    try { await buatPostingan(teks, temaId || null); setTeks(''); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }

  return (
    <div className="kp-card" style={{ marginBottom: 14 }}>
      <textarea className="kp-input" rows={3} placeholder="Bagikan cerita/tips setelah mencoba kelas bermain..." value={teks} onChange={(e) => setTeks(e.target.value)} style={{ resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select className="kp-input" style={{ flex: 1, marginBottom: 0 }} value={temaId} onChange={(e) => setTemaId(e.target.value)}>
          <option value="">(umum)</option>
          {tema.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
        </select>
        <button className="kp-btn mint" onClick={kirim} disabled={loading}>{loading ? '...' : 'Bagikan'}</button>
      </div>
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}
