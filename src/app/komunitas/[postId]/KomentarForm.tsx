// src/app/komunitas/[postId]/KomentarForm.tsx
'use client';
import { useState } from 'react';
import { buatKomentar } from '@/lib/data/komunitas-actions';

export default function KomentarForm({ postId }: { postId: string }) {
  const [teks, setTeks] = useState('');
  const [loading, setLoading] = useState(false);
  async function kirim() {
    if (!teks.trim()) return;
    setLoading(true);
    try { await buatKomentar(postId, teks); setTeks(''); } finally { setLoading(false); }
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <input className="kp-input" style={{ flex: 1, marginBottom: 0 }} placeholder="Tulis komentar..." value={teks} onChange={(e) => setTeks(e.target.value)} />
      <button className="kp-btn mint" onClick={kirim} disabled={loading}>{loading ? '...' : 'Kirim'}</button>
    </div>
  );
}
