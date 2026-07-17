// src/components/game/HitungGame.tsx — engine "Hitung-Kode" (simbol->angka lalu +, −, ×, ÷)
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataHitung, HasilSelesai, OperasiHitung } from '@/lib/game/tipe';
import Aset from './Aset';
import { speak } from '@/lib/tts';

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
function acak<T>(arr: T[], seed: number): T[] {
  return arr.map((v, i) => ({ v, k: ((i + 1) * 9301 + seed * 49297) % 233 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}
function Sim({ v, size = 46 }: { v: string; size?: number }) {
  if (isHex(v)) return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 10, background: v, border: '2px solid #fff', boxShadow: '0 2px 0 #e6def5' }} />;
  return <Aset value={v} size={size} />;
}
function opsiAngka(ans: number, seed: number): number[] {
  const set = new Set<number>([ans]);
  let d = 1;
  while (set.size < 4 && d <= 8) { if (ans - d >= 0) set.add(ans - d); if (set.size < 4) set.add(ans + d); d++; }
  return acak([...set], seed);
}
const SIMBOL_OP: Record<OperasiHitung, string> = { '+': '+', '-': '−', x: '×', ':': '÷' };
function hitungJawaban(op: OperasiHitung, kiri: number, kanan: number): number {
  if (op === '+') return kiri + kanan;
  if (op === '-') return kiri - kanan;
  if (op === 'x') return kiri * kanan;
  return kanan !== 0 ? Math.floor(kiri / kanan) : 0; // ÷ (dibuat pas oleh validasi admin)
}

export default function HitungGame({ data, onSelesai }: { data: DataHitung; onSelesai: (h: HasilSelesai) => void }) {
  const nilai = useMemo(() => new Map(data.legenda.map((m) => [m.simbol, m.nilai])), [data.legenda]);
  const [ronde, setRonde] = useState(0);
  const benarRef = useRef(0);
  const salahRef = useRef(false);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  const soal = data.soal[ronde];
  const ans = soal ? hitungJawaban(soal.operasi, nilai.get(soal.kiri) ?? 0, nilai.get(soal.kanan) ?? 0) : 0;
  const opsi = useMemo(() => (soal ? opsiAngka(ans, ronde + 4) : []), [soal, ans, ronde]);
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
      {/* legenda simbol → angka */}
      <div style={{ background: '#faf7ff', borderRadius: 18, padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {data.legenda.map((m) => (
          <span key={m.simbol} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', borderRadius: 12, padding: '4px 8px', boxShadow: '0 2px 0 #e6def5' }}>
            <Sim v={m.simbol} size={26} /><b style={{ color: 'var(--abu)' }}>=</b><b style={{ fontSize: 18 }}>{m.nilai}</b>
          </span>
        ))}
      </div>

      {/* persamaan */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 18, padding: 14, boxShadow: '0 4px 0 #e6def5', fontSize: 28, fontWeight: 800 }}>
        <Sim v={soal.kiri} size={48} /><span>{SIMBOL_OP[soal.operasi] ?? soal.operasi}</span><Sim v={soal.kanan} size={48} /><span>=</span><span>❓</span>
      </div>

      {/* pilihan angka */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {opsi.map((n, i) => (
          <button key={`${ronde}-${i}`} onClick={(e) => pilih(e, n === ans)}
            style={{ background: '#fff', border: 'none', borderRadius: 16, minWidth: 60, minHeight: 60, fontSize: 26, fontWeight: 800, color: 'var(--lavender-d)', boxShadow: '0 6px 0 #e6def5', cursor: 'pointer' }}>{n}</button>
        ))}
      </div>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>{ronde + 1}/{data.soal.length}</div>
    </div>
  );
}
