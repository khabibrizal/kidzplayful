// src/components/game/Reward.tsx
'use client';
import Confetti from '@/components/ui/Confetti';
import Pewi from '@/components/ui/Pewi';

export default function Reward({
  bintang, benar, total, durasiDetik, bonus, targetDetik, onLagi, onSelesai,
}: { bintang: number; benar: number; total: number; durasiDetik?: number; bonus?: boolean; targetDetik?: number; onLagi: () => void; onSelesai: () => void }) {
  const s = '⭐'.repeat(bintang);
  const jam = (d: number) => (d >= 60 ? `${Math.floor(d / 60)} mnt ${d % 60} dtk` : `${d} detik`);
  return (
    <div className="kp-reward">
      <Confetti />
      <div style={{ fontSize: 60 }}>🎉</div>
      <h2 style={{ fontSize: 30 }}>Hebat!</h2>
      <div className="kp-pop" style={{ fontSize: 40, letterSpacing: 8 }}>{s}</div>
      <Pewi size={84} />
      <p style={{ opacity: .95 }}>Benar {benar} dari {total} · +{benar} koin 🪙</p>
      {typeof durasiDetik === 'number' && <p style={{ opacity: .95, marginTop: -6 }}>⏱ Selesai dalam {jam(durasiDetik)}</p>}
      {bonus && <p className="kp-pop" style={{ fontWeight: 800, background: '#fff3d6', color: '#b88600', borderRadius: 99, padding: '6px 14px', marginTop: 4 }}>⚡ Cepat! Bonus ⭐ + 🪙</p>}
      {targetDetik && !bonus && <p style={{ opacity: .85, fontSize: 13, marginTop: -2 }}>Target ⚡ {jam(targetDetik)} — ayo coba lebih cepat!</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="kp-btn putih" onClick={onLagi}>Main lagi</button>
        <button className="kp-btn putih" onClick={onSelesai}>Selesai</button>
      </div>
    </div>
  );
}
