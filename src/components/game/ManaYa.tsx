// src/components/game/ManaYa.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataTekan, HasilSelesai } from '@/lib/game/tipe';
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
function mix<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  for (let k = 0; k < seed % 4; k++) a.push(a.shift() as T);
  return a;
}

export default function ManaYa({ data, onSelesai }: { data: DataTekan; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const benarRef = useRef(0);
  const mulaiRef = useRef(0);
  const soal = data.soal[ronde];

  useEffect(() => {
    mulaiRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (soal) {
      const t = setTimeout(() => speak('Mana ' + soal.tanya + '?'), 350);
      return () => clearTimeout(t);
    }
  }, [ronde, soal]);

  function pilih(e: React.MouseEvent<HTMLButtonElement>, ok: boolean) {
    const btn = e.currentTarget;
    if (ok) {
      btn.style.outline = '4px solid var(--mint-d)';
      benarRef.current++;
      speak('Hebat!');
      setTimeout(() => {
        if (ronde + 1 >= data.soal.length) {
          onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
        } else setRonde(ronde + 1);
      }, 800);
    } else {
      btn.animate([{ transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }], { duration: 350 });
      speak('Coba lagi ya');
    }
  }

  if (!soal) return null;
  const pilihan = mix([soal.benar, ...soal.salah], ronde + 1);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div role="button" tabIndex={0} aria-label="Dengar lagi" onClick={() => speak('Mana ' + soal.tanya + '?')} style={{ background: '#fff', borderRadius: 22, padding: 16, textAlign: 'center', fontWeight: 800, fontSize: 20, boxShadow: '0 4px 0 #e6def5', cursor: 'pointer' }}>
        🔊 Mana <b>{soal.tanya}</b>?
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px 0' }}>
        {pilihan.map((emo, i) => (
          <button key={i} onClick={(e) => pilih(e, emo === soal.benar)}
            style={{ background: '#fff', border: 'none', borderRadius: 24, fontSize: 62, boxShadow: '0 6px 0 #e6def5', cursor: 'pointer' }}>
            <Aset value={emo} size={62} />
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>{ronde + 1}/{data.soal.length}</div>
    </div>
  );
}
