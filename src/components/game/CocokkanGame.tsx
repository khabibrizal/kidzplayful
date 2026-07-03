// src/components/game/CocokkanGame.tsx — engine "Cocokkan" (asosiasi kiri↔kanan)
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataCocokkan, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';

function speak(t: string) {
  try {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'id-ID'; u.rate = 0.9; u.pitch = 1.15;
      speechSynthesis.speak(u);
    }
  } catch { /* abaikan */ }
}
const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
function acak<T>(arr: T[], seed: number): T[] {
  return arr.map((v, i) => ({ v, k: ((i + 1) * 9301 + seed * 49297) % 233 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}
function Sim({ v, size = 44 }: { v: string; size?: number }) {
  if (isHex(v)) return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 10, background: v, border: '2px solid #fff', boxShadow: '0 2px 0 #e6def5' }} />;
  return <Aset value={v} size={size} />;
}

export default function CocokkanGame({ data, onSelesai }: { data: DataCocokkan; onSelesai: (h: HasilSelesai) => void }) {
  const pairs = data.pasangan;
  const [pilihKiri, setPilihKiri] = useState<number | null>(null);
  const [cocok, setCocok] = useState<number[]>([]);   // index pasangan yang sudah cocok
  const salahRef = useRef<Set<number>>(new Set());
  const benarRef = useRef(0);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  const kanan = useMemo(() => acak(pairs.map((p, idx) => ({ v: p.kanan, idx })), 7), [pairs]);

  function tapKanan(e: React.MouseEvent<HTMLButtonElement>, r: { v: string; idx: number }) {
    if (cocok.includes(r.idx)) return;
    const btn = e.currentTarget;
    if (pilihKiri === null) { speak('Pilih kiri dulu'); return; }
    if (r.idx === pilihKiri) {
      if (!salahRef.current.has(pilihKiri)) benarRef.current++;
      const baru = [...cocok, pilihKiri];
      setCocok(baru); setPilihKiri(null); speak('Bagus!');
      if (baru.length >= pairs.length) {
        setTimeout(() => onSelesai({ benar: benarRef.current, total: pairs.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) }), 650);
      }
    } else {
      salahRef.current.add(pilihKiri); btn.classList.add('kp-shake'); speak('Bukan itu, coba lagi');
      setTimeout(() => btn.classList.remove('kp-shake'), 450);
    }
  }

  const gaya = (aktif: boolean, sudah: boolean): React.CSSProperties => ({
    background: sudah ? '#dff5e6' : '#fff', border: aktif ? '3px solid var(--lavender-d)' : '3px solid transparent',
    borderRadius: 16, minHeight: 58, padding: 8, boxShadow: sudah ? 'none' : '0 5px 0 #e6def5',
    cursor: sudah ? 'default' : 'pointer', opacity: sudah ? 0.55 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>Ketuk gambar di kiri, lalu pasangannya di kanan 🔗</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pairs.map((p, i) => {
            const sudah = cocok.includes(i);
            return (
              <button key={i} onClick={() => { if (!sudah) { setPilihKiri(i); } }} disabled={sudah} style={gaya(pilihKiri === i, sudah)}>
                <Sim v={p.kiri} size={40} />{sudah && <span>✓</span>}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {kanan.map((r) => {
            const sudah = cocok.includes(r.idx);
            return (
              <button key={r.idx} onClick={(e) => tapKanan(e, r)} disabled={sudah} style={gaya(false, sudah)}>
                <Sim v={r.v} size={40} />{sudah && <span>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>{cocok.length}/{pairs.length} cocok</div>
    </div>
  );
}
