// src/app/pengaturan/FeedbackForm.tsx — form masukan aplikasi (di halaman Pengaturan)
'use client';
import { useState } from 'react';
import { kirimFeedback } from '@/lib/data/feedback-actions';

export default function FeedbackForm() {
  const [buka, setBuka] = useState(false);
  const [rating, setRating] = useState(0);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [sukses, setSukses] = useState(false);

  async function kirim() {
    setMsg('');
    if (!pesan.trim()) { setMsg('Tulis masukan Anda dulu ya.'); return; }
    setLoading(true);
    try {
      await kirimFeedback(rating, pesan);
      setSukses(true); setPesan(''); setRating(0);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal mengirim.'); }
    finally { setLoading(false); }
  }

  if (sukses) {
    return (
      <div className="kp-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>🙏</div>
        <p style={{ marginTop: 6, color: 'var(--tinta)' }}>Terima kasih atas masukannya! Kami membacanya untuk membuat KidzPlayful lebih baik.</p>
        <button className="kp-btn putih" style={{ marginTop: 10 }} onClick={() => { setSukses(false); setBuka(false); }}>Selesai</button>
      </div>
    );
  }

  if (!buka) {
    return (
      <div className="kp-card">
        <p style={{ fontSize: 13, color: 'var(--abu)', marginBottom: 10 }}>Punya saran, keluhan, atau ide untuk aplikasi ini? Kami senang mendengarnya. 🌿</p>
        <button className="kp-btn mint" style={{ width: '100%' }} onClick={() => setBuka(true)}>💬 Beri Masukan</button>
      </div>
    );
  }

  return (
    <div className="kp-card">
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Seberapa puas Anda? (opsional)</label>
      <div style={{ display: 'flex', gap: 6, margin: '6px 0 12px' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n === rating ? 0 : n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 28, padding: 0, filter: n <= rating ? 'none' : 'grayscale(1)', opacity: n <= rating ? 1 : 0.4 }}>⭐</button>
        ))}
      </div>
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Masukan Anda</label>
      <textarea className="kp-input" rows={4} value={pesan} onChange={(e) => setPesan(e.target.value)} placeholder="Tulis saran/keluhan/ide di sini…" style={{ resize: 'vertical' }} />
      {msg && <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={kirim} disabled={loading}>{loading ? 'Mengirim…' : 'Kirim Masukan'}</button>
      <button className="kp-btn putih" style={{ width: '100%', marginTop: 8 }} onClick={() => setBuka(false)}>Batal</button>
    </div>
  );
}
