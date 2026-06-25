// src/components/game/BeresBeres.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataSeret, HasilSelesai } from '@/lib/game/tipe';

export default function BeresBeres({ data, onSelesai }: { data: DataSeret; onSelesai: (h: HasilSelesai) => void }) {
  const [sisa, setSisa] = useState(data.benda);
  const benarRef = useRef(0);
  const mulaiRef = useRef(0);
  const dragRef = useRef<{ el: HTMLElement; cat: string; sx: number; sy: number } | null>(null);
  const total = data.benda.length;

  useEffect(() => {
    mulaiRef.current = Date.now();
  }, []);

  function down(e: React.PointerEvent<HTMLDivElement>, cat: string) {
    e.preventDefault();
    const el = e.currentTarget;
    dragRef.current = { el, cat, sx: e.clientX, sy: e.clientY };
    el.style.transition = 'none'; el.style.zIndex = '20';
    el.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current; if (!d) return;
    d.el.style.transform = `translate(${e.clientX - d.sx}px,${e.clientY - d.sy}px) scale(1.12)`;
  }
  function up(e: React.PointerEvent<HTMLDivElement>, emoji: string) {
    const d = dragRef.current; if (!d) return;
    dragRef.current = null;
    d.el.style.pointerEvents = 'none';
    const below = document.elementFromPoint(e.clientX, e.clientY);
    d.el.style.pointerEvents = '';
    const bin = below?.closest('[data-cat]') as HTMLElement | null;
    if (bin && bin.dataset.cat === d.cat) {
      benarRef.current++;
      const baru = sisa.filter((b) => b.emoji !== emoji || b.kategori !== d.cat);
      // hapus satu instance yang cocok
      const idx = sisa.findIndex((b) => b.emoji === emoji);
      const next = sisa.slice(); next.splice(idx, 1);
      setSisa(next);
      if (next.length === 0) {
        queueMicrotask(() => {
          onSelesai({ benar: benarRef.current, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
        });
      }
      void baru;
    } else {
      d.el.style.transition = 'transform .25s'; d.el.style.transform = '';
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 14, textAlign: 'center', fontWeight: 800, boxShadow: '0 4px 0 #e6def5' }}>🧺 Seret ke tempat yang benar</div>
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'center', padding: 14 }}>
        {sisa.map((b, i) => (
          <div key={i} onPointerDown={(e) => down(e, b.kategori)} onPointerMove={move} onPointerUp={(e) => up(e, b.emoji)}
            style={{ width: 84, height: 84, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, boxShadow: '0 6px 0 #e6def5', touchAction: 'none', cursor: 'grab' }}>
            {b.emoji}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', paddingBottom: 8 }}>
        {data.wadah.map((w) => (
          <div key={w.kategori} data-cat={w.kategori}
            style={{ flex: 1, height: 110, borderRadius: 22, background: '#efe7fb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 38, border: '3px dashed #c9b6f0', color: '#7b6aa0' }}>
            {w.emoji}<small style={{ fontSize: 13, fontWeight: 700 }}>{w.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
