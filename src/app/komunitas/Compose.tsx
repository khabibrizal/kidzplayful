// src/app/komunitas/Compose.tsx
'use client';
import { useState } from 'react';
import { buatPostingan } from '@/lib/data/komunitas-actions';

export default function Compose({ opsi, topikAwal }: { opsi: string[]; topikAwal?: string }) {
  const [teks, setTeks] = useState('');
  const [topik, setTopik] = useState(topikAwal ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function kirim() {
    setErr('');
    if (!teks.trim()) { setErr('Tulis ceritamu dulu ya.'); return; }
    setLoading(true);
    try { await buatPostingan(teks, topik.trim() || null); setTeks(''); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }

  return (
    <div className="kp-card" style={{ marginBottom: 14 }}>
      <textarea className="kp-input" rows={3} placeholder="Bagikan cerita/tips setelah mencoba kelas bermain..." value={teks} onChange={(e) => setTeks(e.target.value)} style={{ resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input className="kp-input" list="topik-opsi" placeholder="Topik (mis. judul materi/event/game)" value={topik} onChange={(e) => setTopik(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
        <datalist id="topik-opsi">
          {opsi.map((t) => <option key={t} value={t} />)}
        </datalist>
        <button className="kp-btn mint" onClick={kirim} disabled={loading}>{loading ? '...' : 'Bagikan'}</button>
      </div>
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}
