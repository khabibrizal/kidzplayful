// src/components/RekomendasiForm.tsx — psikolog menulis rekomendasi ("resep") untuk seorang anak
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { simpanRekomendasi } from '@/lib/data/psikolog-actions';
import type { ButirRekomendasi } from '@/lib/game/tipe';

export default function RekomendasiForm({ anakId, ortuId, pendaftaranId }: { anakId: string; ortuId: string; pendaftaranId: string | null }) {
  const router = useRouter();
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [butir, setButir] = useState<ButirRekomendasi[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  function ubahButir(i: number, k: keyof ButirRekomendasi, v: string) {
    setButir((b) => b.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  }

  async function simpan() {
    setBusy(true); setMsg(''); setOk(false);
    try {
      const r = await simpanRekomendasi({ anakId, ortuId, pendaftaranId, judul, isi, butir });
      if (r.ok) { setOk(true); setMsg('Rekomendasi terkirim ✓'); setJudul(''); setIsi(''); setButir([]); router.refresh(); }
      else { setOk(false); setMsg(r.error ?? 'Gagal.'); }
    } finally { setBusy(false); }
  }

  return (
    <div className="kp-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <b style={{ color: 'var(--lavender-d)' }}>🧠 Tulis Rekomendasi</b>
      <input className="kp-input" placeholder="Judul (mis. Stimulasi Bicara)" value={judul} onChange={(e) => setJudul(e.target.value)} style={{ marginBottom: 0 }} />
      <textarea className="kp-input" placeholder="Isi rekomendasi untuk orang tua…" rows={3} value={isi} onChange={(e) => setIsi(e.target.value)} style={{ resize: 'vertical', marginBottom: 0 }} />

      {butir.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input className="kp-input" placeholder="Poin (judul)" value={b.judul} onChange={(e) => ubahButir(i, 'judul', e.target.value)} style={{ marginBottom: 0 }} />
            <input className="kp-input" placeholder="Penjelasan poin" value={b.isi} onChange={(e) => ubahButir(i, 'isi', e.target.value)} style={{ marginBottom: 0 }} />
          </div>
          <button type="button" onClick={() => setButir((x) => x.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#c0392b' }} title="Hapus poin">✕</button>
        </div>
      ))}
      <button type="button" className="kp-btn putih" onClick={() => setButir((b) => [...b, { judul: '', isi: '' }])} style={{ alignSelf: 'flex-start' }}>+ Tambah poin</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="kp-btn mint" onClick={simpan} disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Menyimpan…' : '💾 Kirim Rekomendasi'}</button>
        {msg && <span style={{ fontSize: 13, fontWeight: 700, color: ok ? '#1c7a43' : '#c0392b' }}>{msg}</span>}
      </div>
    </div>
  );
}
