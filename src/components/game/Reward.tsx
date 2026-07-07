// src/components/game/Reward.tsx
'use client';
import Confetti from '@/components/ui/Confetti';
import Pewi from '@/components/ui/Pewi';
import { BONUS_TANTANGAN } from '@/lib/domain/gamifikasi';

type LencanaBaru = { emoji?: string; judul?: string };
type TantanganInfo = { emoji: string; judul: string; progress: number; target: number; bonusBaru: boolean };

export default function Reward({
  bintang, benar, total, durasiDetik, bonus, targetDetik, streak, lencanaBaru, tantangan, onLagi, onSelesai,
}: {
  bintang: number; benar: number; total: number; durasiDetik?: number; bonus?: boolean; targetDetik?: number;
  streak?: number; lencanaBaru?: LencanaBaru[]; tantangan?: TantanganInfo;
  onLagi: () => void; onSelesai: () => void;
}) {
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

      {typeof streak === 'number' && streak > 0 && (
        <p className="kp-pop" style={{ fontWeight: 800, background: '#ffe9d6', color: '#d1660a', borderRadius: 99, padding: '6px 14px', marginTop: 6 }}>🔥 Streak {streak} hari!</p>
      )}
      {tantangan?.bonusBaru && (
        <p className="kp-pop" style={{ fontWeight: 800, background: '#dff5e6', color: '#1c7a43', borderRadius: 99, padding: '6px 14px', marginTop: 4 }}>🎯 Tantangan harian selesai! 🪙 +{BONUS_TANTANGAN}</p>
      )}
      {(lencanaBaru ?? []).map((l, i) => (
        <p key={i} className="kp-pop" style={{ fontWeight: 800, background: '#efe7fb', color: '#7c5cd6', borderRadius: 99, padding: '6px 14px', marginTop: 4 }}>🏅 Lencana baru: {l.emoji} {l.judul}</p>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="kp-btn putih" onClick={onLagi}>Main lagi</button>
        <button className="kp-btn putih" onClick={onSelesai}>Selesai</button>
      </div>
    </div>
  );
}
