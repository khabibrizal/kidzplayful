// src/components/game/SukuKataGame.tsx — engine "Rangkai Suku Kata" (calistung BACA)
// Mode 'susun': susun suku kata jadi kata (gambar + suara). Mode 'dengar': fonik — dengar lalu pilih.
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataSukuKata, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';
import { speak, bunyikan } from '@/lib/tts';

function acak<T>(arr: T[], seed: number): T[] {
  return arr.map((v, i) => ({ v, k: ((i + 1) * 9301 + seed * 49297) % 233 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}

const kartuGaya = (nonaktif = false): React.CSSProperties => ({
  minWidth: 64, minHeight: 56, padding: '8px 14px', borderRadius: 16, border: 'none',
  fontSize: 24, fontWeight: 800, color: 'var(--lavender-d)', background: nonaktif ? '#eee' : '#fff',
  boxShadow: nonaktif ? 'none' : '0 5px 0 #e6def5', cursor: nonaktif ? 'default' : 'pointer', opacity: nonaktif ? 0.4 : 1,
});

export default function SukuKataGame({ data, onSelesai }: { data: DataSukuKata; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const [pos, setPos] = useState(0);            // slot berikutnya (mode susun)
  const [used, setUsed] = useState<string[]>([]);
  const benarRef = useRef(0);
  const salahRef = useRef(false);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  const soal = data.soal[ronde];

  const kartu = useMemo(() => {
    if (!soal) return [];
    const benar = soal.mode === 'susun' ? soal.sukuKata : [soal.kata];
    const dari = benar.map((s, i) => ({ s, id: 'b' + i }));
    const decoy = (soal.pengecoh ?? []).filter((x) => x.trim()).map((s, i) => ({ s, id: 'd' + i }));
    return acak([...dari, ...decoy], ronde + 5);
  }, [ronde, soal]);

  // mode 'dengar': ucapkan target saat soal muncul
  useEffect(() => {
    if (soal?.mode === 'dengar') { const t = setTimeout(() => bunyikan(soal.kata, soal.audio_url), 400); return () => clearTimeout(t); }
  }, [ronde, soal]);

  if (!soal) return null;
  const targetSlot = soal.mode === 'susun' ? soal.sukuKata : [soal.kata];

  function lanjut() {
    if (!salahRef.current) benarRef.current++;
    speak('Hebat!');
    setTimeout(() => {
      if (ronde + 1 >= data.soal.length) onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
      else { setRonde(ronde + 1); setPos(0); setUsed([]); salahRef.current = false; }
    }, 900);
  }

  function tap(e: React.MouseEvent<HTMLButtonElement>, k: { s: string; id: string }) {
    if (used.includes(k.id)) return;
    const btn = e.currentTarget;
    if (soal.mode === 'dengar') {
      if (k.s === soal.kata) { setUsed([...used, k.id]); bunyikan(soal.kata, soal.audio_url); btn.classList.add('kp-pop'); lanjut(); }
      else { salahRef.current = true; btn.classList.add('kp-shake'); speak('Bukan itu, dengarkan lagi ya'); setTimeout(() => btn.classList.remove('kp-shake'), 450); setTimeout(() => bunyikan(soal.kata, soal.audio_url), 900); }
      return;
    }
    // mode susun
    if (k.s === targetSlot[pos]) {
      const np = pos + 1;
      setUsed([...used, k.id]); setPos(np); speak(k.s);
      if (np >= targetSlot.length) { setTimeout(() => bunyikan(soal.kata, soal.audio_url), 350); lanjut(); }
    } else {
      salahRef.current = true; btn.classList.add('kp-shake'); speak('Bukan itu, coba lagi');
      setTimeout(() => btn.classList.remove('kp-shake'), 450);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>
        {soal.mode === 'dengar' ? 'Dengarkan, lalu ketuk suku kata yang kamu dengar! 👂' : 'Susun suku katanya jadi kata ya! 📖'}
      </div>

      {soal.mode === 'susun' && soal.gambar && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 10, boxShadow: '0 4px 0 #e6def5' }}><Aset value={soal.gambar} size={90} /></div>
      )}

      <button className="kp-btn putih" onClick={() => bunyikan(soal.kata, soal.audio_url)} style={{ padding: '8px 18px' }}>🔊 Dengar{soal.mode === 'susun' ? ' kata' : ' lagi'}</button>

      {soal.mode === 'susun' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {targetSlot.map((s, i) => (
            <span key={i} style={{ minWidth: 56, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: '0 10px', fontSize: 24, fontWeight: 800, color: i < pos ? 'var(--lavender-d)' : '#cdbff0', background: '#fff', border: i === pos ? '3px solid var(--lavender-d)' : '2px dashed #cdbff0' }}>
              {i < pos ? s : ''}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {kartu.map((k) => {
          const sudah = used.includes(k.id);
          return <button key={k.id} onClick={(e) => tap(e, k)} disabled={sudah} style={kartuGaya(sudah)}>{k.s}</button>;
        })}
      </div>
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>{ronde + 1}/{data.soal.length}</div>
    </div>
  );
}
