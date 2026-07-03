// src/components/game/UrutanGame.tsx — engine "Urutan & Pola"
// tipe 'urutkan' (tata item ke urutan benar) & 'pola' (lanjutkan pola).
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataUrutan, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';
import { speak } from '@/lib/tts';

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
function acak<T>(arr: T[], seed: number): T[] {
  return arr.map((v, i) => ({ v, k: ((i + 1) * 9301 + seed * 49297) % 233 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}
function Sim({ v, size = 44 }: { v: string; size?: number }) {
  if (isHex(v)) return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 10, background: v, border: '2px solid #fff', boxShadow: '0 2px 0 #e6def5' }} />;
  return <Aset value={v} size={size} />;
}

// ---------- Mode Lanjutkan Pola ----------
function PolaMode({ data, onSelesai }: { data: DataUrutan; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const benarRef = useRef(0);
  const salahRef = useRef(false);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  const soal = data.soal[ronde];
  const pilihan = useMemo(() => (soal ? acak([soal.benar ?? '', ...(soal.salah ?? [])], ronde + 3) : []), [ronde, soal]);
  if (!soal) return null;

  function pilih(e: React.MouseEvent<HTMLButtonElement>, ok: boolean) {
    const btn = e.currentTarget;
    if (ok) {
      if (!salahRef.current) benarRef.current++;
      btn.classList.add('kp-pop'); speak('Hebat!');
      setTimeout(() => {
        if (ronde + 1 >= data.soal.length) onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
        else { salahRef.current = false; setRonde(ronde + 1); }
      }, 700);
    } else {
      salahRef.current = true; btn.classList.add('kp-shake'); speak('Coba lagi ya');
      setTimeout(() => btn.classList.remove('kp-shake'), 450);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>Lanjutkan polanya ya! 🔎</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center', background: '#fff', borderRadius: 18, padding: 12, boxShadow: '0 4px 0 #e6def5' }}>
        {(soal.tampil ?? []).map((v, i) => <Sim key={i} v={v} size={44} />)}
        <span style={{ width: 44, height: 44, borderRadius: 10, border: '3px dashed var(--lavender-d)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>❓</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {pilihan.map((v, i) => (
          <button key={`${ronde}-${i}`} onClick={(e) => pilih(e, v === soal.benar)}
            style={{ background: '#fff', border: 'none', borderRadius: 18, minWidth: 64, minHeight: 64, padding: 8, boxShadow: '0 6px 0 #e6def5', cursor: 'pointer' }}>
            <Sim v={v} size={40} />
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>{ronde + 1}/{data.soal.length}</div>
    </div>
  );
}

// ---------- Mode Urutkan ----------
function UrutkanMode({ data, onSelesai }: { data: DataUrutan; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const [pos, setPos] = useState(0);
  const [taken, setTaken] = useState<number[]>([]);
  const benarRef = useRef(0);
  const salahRef = useRef(false);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  const soal = data.soal[ronde];
  const urut = soal?.urut ?? [];
  const chips = useMemo(() => acak(urut.map((val, idx) => ({ val, idx })), ronde + 5), [ronde, urut]);
  if (!soal) return null;

  function tapChip(e: React.MouseEvent<HTMLButtonElement>, chip: { val: string; idx: number }) {
    if (taken.includes(chip.idx)) return;
    const btn = e.currentTarget;
    if (chip.val === urut[pos]) {
      const np = pos + 1;
      setTaken([...taken, chip.idx]); setPos(np); speak('Bagus!');
      if (np >= urut.length) {
        if (!salahRef.current) benarRef.current++;
        setTimeout(() => {
          if (ronde + 1 >= data.soal.length) onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
          else { setRonde(ronde + 1); setPos(0); setTaken([]); salahRef.current = false; }
        }, 700);
      }
    } else {
      salahRef.current = true; btn.classList.add('kp-shake'); speak('Coba lagi ya');
      setTimeout(() => btn.classList.remove('kp-shake'), 450);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>Ketuk berurutan{soal.petunjuk ? ` — ${soal.petunjuk}` : ' dari yang benar'} 👆</div>
      {/* baris jawaban */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', minHeight: 56, background: '#fff', borderRadius: 18, padding: 10, boxShadow: '0 4px 0 #e6def5' }}>
        {taken.length === 0 && <span style={{ color: 'var(--abu)', fontSize: 13, alignSelf: 'center' }}>(ketuk item di bawah sesuai urutan)</span>}
        {taken.map((tid, i) => <Sim key={i} v={urut[tid]} size={40} />)}
      </div>
      {/* pilihan chip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {chips.map((chip) => {
          const sudah = taken.includes(chip.idx);
          return (
            <button key={chip.idx} onClick={(e) => tapChip(e, chip)} disabled={sudah}
              style={{ background: sudah ? '#eee' : '#fff', border: 'none', borderRadius: 18, minWidth: 64, minHeight: 64, padding: 8, boxShadow: sudah ? 'none' : '0 6px 0 #e6def5', cursor: sudah ? 'default' : 'pointer', opacity: sudah ? 0.4 : 1 }}>
              <Sim v={chip.val} size={40} />
            </button>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>{ronde + 1}/{data.soal.length}</div>
    </div>
  );
}

export default function UrutanGame({ data, onSelesai }: { data: DataUrutan; onSelesai: (h: HasilSelesai) => void }) {
  if (data.tipe === 'pola') return <PolaMode data={data} onSelesai={onSelesai} />;
  return <UrutkanMode data={data} onSelesai={onSelesai} />;
}
