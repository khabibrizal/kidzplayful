// src/components/game/VideoPojok.tsx
'use client';
import { useState } from 'react';
import type { Video } from '@/lib/game/tipe';

const MAKS_TONTON = 2;

export default function VideoPojok({ video, onKeluar, batasi = false, onTerkunci }: { video: Video[]; onKeluar: () => void; batasi?: boolean; onTerkunci?: () => void }) {
  const [aktif, setAktif] = useState<Video | null>(null);
  const [ditonton, setDitonton] = useState(0);
  const terkunci = (v: Video) => batasi && v.boleh_trial === false;

  if (ditonton >= MAKS_TONTON) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10, padding: 24 }}>
        <div style={{ fontSize: 60 }}>😊</div>
        <h2>Cukup dulu ya</h2>
        <p style={{ color: 'var(--abu)' }}>Yuk main game lagi!</p>
        <button className="kp-btn" onClick={onKeluar}>Kembali</button>
      </div>
    );
  }

  if (aktif) {
    const src = `https://www.youtube-nocookie.com/embed/${aktif.youtube_id}?rel=0&modestbranding=1&controls=1&disablekb=1`;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 18, overflow: 'hidden', background: '#2b2440' }}>
          <iframe title={aktif.judul} src={src} allow="encrypted-media" allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        </div>
        <button className="kp-btn" onClick={() => { setAktif(null); setDitonton((d) => d + 1); }}>Selesai nonton</button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
      <div style={{ fontSize: 12, color: 'var(--abu)', textAlign: 'center' }}>Maks. {MAKS_TONTON} video · dipilih KidzPlayful</div>
      {video.length === 0 && <p style={{ color: 'var(--abu)', textAlign: 'center' }}>Belum ada video untuk tema ini.</p>}
      {video.map((v) => {
        const kunci = terkunci(v);
        return (
          <button key={v.id} className="kp-card" onClick={() => (kunci ? onTerkunci?.() : setAktif(v))}
            style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', border: 'none', cursor: 'pointer', opacity: kunci ? 0.7 : 1 }}>
            <span style={{ fontSize: 30 }}>{kunci ? '🔒' : '▶'}</span>
            <span><b>{v.judul}</b><br /><small style={{ color: 'var(--abu)' }}>{kunci ? 'khusus pelanggan' : `${Math.round(v.durasi_detik / 60)} menit`}</small></span>
          </button>
        );
      })}
      <button className="kp-btn" style={{ marginTop: 8 }} onClick={onKeluar}>Kembali</button>
    </div>
  );
}
