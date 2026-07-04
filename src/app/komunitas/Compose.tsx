// src/app/komunitas/Compose.tsx
'use client';
import { useState } from 'react';
import { buatPostingan } from '@/lib/data/komunitas-actions';

const LAINNYA = '__lainnya__';

export default function Compose({ opsi, topikAwal }: { opsi: string[]; topikAwal?: string }) {
  const awal = topikAwal ?? '';
  const awalDiOpsi = awal !== '' && opsi.includes(awal);
  const [teks, setTeks] = useState('');
  // pilihan = nilai dropdown; kalau topik awal tak ada di daftar → mode "ketik sendiri"
  const [pilihan, setPilihan] = useState(awal === '' ? '' : awalDiOpsi ? awal : LAINNYA);
  const [topikKustom, setTopikKustom] = useState(awalDiOpsi ? '' : awal);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const topik = pilihan === LAINNYA ? topikKustom : pilihan;

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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="kp-input" value={pilihan} onChange={(e) => setPilihan(e.target.value)} style={{ flex: 1, marginBottom: 0, minWidth: 160 }}>
          <option value="">Pilih topik (opsional)</option>
          {opsi.map((t) => <option key={t} value={t}>{t}</option>)}
          <option value={LAINNYA}>✏️ Ketik topik sendiri…</option>
        </select>
        <button className="kp-btn mint" onClick={kirim} disabled={loading}>{loading ? '...' : 'Bagikan'}</button>
      </div>
      {pilihan === LAINNYA && (
        <input className="kp-input" placeholder="Ketik topik sendiri" value={topikKustom} onChange={(e) => setTopikKustom(e.target.value)} style={{ marginTop: 8, marginBottom: 0 }} />
      )}
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}
