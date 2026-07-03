// src/components/game/GarisGame.tsx — engine "Titik & Garis" (hubungkan titik sesuai contoh)
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataGaris, HasilSelesai } from '@/lib/game/tipe';
import { speak } from '@/lib/tts';

const ek = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function GridSVG({ kolom, baris, edges, gap = 62, interaktif = false, sel = null, onDot }: {
  kolom: number; baris: number; edges: string[]; gap?: number; interaktif?: boolean; sel?: number | null; onDot?: (i: number) => void;
}) {
  const pad = gap * 0.4;
  const W = pad * 2 + (kolom - 1) * gap, H = pad * 2 + (baris - 1) * gap;
  const pos = (i: number) => ({ x: pad + (i % kolom) * gap, y: pad + Math.floor(i / kolom) * gap });
  return (
    <svg width={W} height={H} style={{ touchAction: 'manipulation' }}>
      {edges.map((e, k) => { const [a, b] = e.split('-').map(Number); const A = pos(a), B = pos(b); return <line key={k} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="var(--lavender-d)" strokeWidth={4} strokeLinecap="round" />; })}
      {Array.from({ length: kolom * baris }).map((_, i) => { const P = pos(i); return <circle key={i} cx={P.x} cy={P.y} r={gap * 0.13} fill={sel === i ? 'var(--mint-d)' : '#5b5170'} style={interaktif ? { cursor: 'pointer' } : undefined} onClick={interaktif && onDot ? () => onDot(i) : undefined} />; })}
    </svg>
  );
}

export default function GarisGame({ data, onSelesai }: { data: DataGaris; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [drawn, setDrawn] = useState<string[]>([]);
  const benarRef = useRef(0);
  const salahRef = useRef(false);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  const soal = data.soal[ronde];
  const target = useMemo(() => (soal ? soal.garis.map((g) => ek(g[0], g[1])) : []), [soal]);
  if (!soal) return null;
  const targetSet = new Set(target);

  function tapDot(i: number) {
    if (sel === null) { setSel(i); return; }
    if (sel === i) { setSel(null); return; }
    const key = ek(sel, i);
    setSel(null);
    if (drawn.includes(key)) return;
    if (targetSet.has(key)) {
      const nd = [...drawn, key]; setDrawn(nd); speak('Bagus!');
      if (nd.length >= targetSet.size) {
        if (!salahRef.current) benarRef.current++;
        speak('Hebat!');
        setTimeout(() => {
          if (ronde + 1 >= data.soal.length) onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
          else { setRonde(ronde + 1); setSel(null); setDrawn([]); salahRef.current = false; }
        }, 750);
      }
    } else { salahRef.current = true; speak('Bukan itu, coba lagi'); }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ color: 'var(--abu)', fontSize: 13, textAlign: 'center' }}>Ketuk 2 titik untuk membuat garis — tiru contohnya ya! ✏️</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--abu)' }}>
        Contoh:
        <span style={{ background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 2px 0 #e6def5' }}><GridSVG kolom={soal.kolom} baris={soal.baris} edges={target} gap={34} /></span>
      </div>
      <div style={{ background: '#fff', borderRadius: 24, padding: 12, boxShadow: '0 6px 0 #e6def5' }}>
        <GridSVG kolom={soal.kolom} baris={soal.baris} edges={drawn} gap={64} interaktif sel={sel} onDot={tapDot} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="kp-btn putih" onClick={() => { setDrawn([]); setSel(null); }}>↺ Ulang</button>
      </div>
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>{drawn.length}/{targetSet.size} garis · soal {ronde + 1}/{data.soal.length}</div>
    </div>
  );
}
