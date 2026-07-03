// src/components/game/EjaKataGame.tsx — engine "Eja Kata" (eja nama benda dari gambar)
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataEjaKata, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';
import { speak } from '@/lib/tts';

function acak<T>(arr: T[], seed: number): T[] {
  return arr.map((v, i) => ({ v, k: ((i + 1) * 9301 + seed * 49297) % 233 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}

export default function EjaKataGame({ data, onSelesai }: { data: DataEjaKata; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const [pos, setPos] = useState(0);
  const [used, setUsed] = useState<string[]>([]);
  const benarRef = useRef(0);
  const salahRef = useRef(false);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  const soal = data.soal[ronde];
  const kata = (soal?.kata ?? '').toUpperCase();
  const tiles = useMemo(() => {
    const dari = kata.split('').map((c, i) => ({ c, id: 'k' + i }));
    const decoy = (soal?.pengecoh ?? '').toUpperCase().split('').filter((x) => x.trim()).map((c, i) => ({ c, id: 'd' + i }));
    return acak([...dari, ...decoy], ronde + 3);
  }, [ronde, kata, soal]);
  if (!soal) return null;

  function tap(e: React.MouseEvent<HTMLButtonElement>, tile: { c: string; id: string }) {
    if (used.includes(tile.id)) return;
    const btn = e.currentTarget;
    if (tile.c === kata[pos]) {
      const np = pos + 1;
      setUsed([...used, tile.id]); setPos(np); speak(tile.c);
      if (np >= kata.length) {
        if (!salahRef.current) benarRef.current++;
        speak('Hebat!');
        setTimeout(() => {
          if (ronde + 1 >= data.soal.length) onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
          else { setRonde(ronde + 1); setPos(0); setUsed([]); salahRef.current = false; }
        }, 750);
      }
    } else {
      salahRef.current = true; btn.classList.add('kp-shake'); speak('Bukan itu, coba lagi');
      setTimeout(() => btn.classList.remove('kp-shake'), 450);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>Eja namanya, ketuk huruf berurutan ya! ✏️</div>
      {soal.gambar && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 10, boxShadow: '0 4px 0 #e6def5' }}><Aset value={soal.gambar} size={90} /></div>
      )}
      {/* slot huруf (target sebagai panduan pudar, terisi solid saat benar) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {kata.split('').map((c, i) => (
          <span key={i} style={{ width: 40, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontSize: 26, fontWeight: i < pos ? 800 : 600, color: i < pos ? 'var(--lavender-d)' : '#cdbff0', background: '#fff', border: i === pos ? '3px solid var(--lavender-d)' : '2px dashed #cdbff0' }}>{c}</span>
        ))}
      </div>
      {/* tumpukan huruf */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {tiles.map((t) => {
          const sudah = used.includes(t.id);
          return (
            <button key={t.id} onClick={(e) => tap(e, t)} disabled={sudah}
              style={{ width: 52, height: 52, borderRadius: 14, border: 'none', fontSize: 24, fontWeight: 800, color: 'var(--lavender-d)', background: sudah ? '#eee' : '#fff', boxShadow: sudah ? 'none' : '0 5px 0 #e6def5', cursor: sudah ? 'default' : 'pointer', opacity: sudah ? 0.4 : 1 }}>{t.c}</button>
          );
        })}
      </div>
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>{ronde + 1}/{data.soal.length}</div>
    </div>
  );
}
