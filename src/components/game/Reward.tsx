// src/components/game/Reward.tsx
'use client';
export default function Reward({
  bintang, benar, total, onLagi, onSelesai,
}: { bintang: number; benar: number; total: number; onLagi: () => void; onSelesai: () => void }) {
  const s = '⭐'.repeat(bintang);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8, color: '#fff', background: 'linear-gradient(170deg,#d9c9ff,#bfe6ff)', borderRadius: 24, padding: 24 }}>
      <div style={{ fontSize: 60 }}>🎉</div>
      <h2 style={{ fontSize: 30 }}>Hebat!</h2>
      <div style={{ fontSize: 40, letterSpacing: 8 }}>{s}</div>
      <p style={{ opacity: .95 }}>Benar {benar} dari {total} · +{benar} koin 🪙</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="kp-btn" style={{ background: '#fff', color: 'var(--lavender-d)', boxShadow: '0 5px 0 #c9b6f0' }} onClick={onLagi}>Main lagi</button>
        <button className="kp-btn" style={{ background: '#fff', color: 'var(--lavender-d)', boxShadow: '0 5px 0 #c9b6f0' }} onClick={onSelesai}>Selesai</button>
      </div>
    </div>
  );
}
