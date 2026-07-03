// src/components/game/Dekode.tsx — game "Pecahkan Kode" (dekode simbol -> nilai)
'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataDekode, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';
import { speak } from '@/lib/tts';

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
function mix<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  for (let k = 0; k < seed % 5; k++) a.push(a.shift() as T);
  return a;
}

// render satu simbol/nilai: warna hex -> swatch, selain itu emoji/gambar/teks
function Simbol({ v, size = 44 }: { v: string; size?: number }) {
  if (isHex(v)) return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 10, background: v, border: '2px solid #fff', boxShadow: '0 2px 0 #e6def5' }} />;
  return <Aset value={v} size={size} />;
}

export default function Dekode({ data, onSelesai }: { data: DataDekode; onSelesai: (h: HasilSelesai) => void }) {
  const nilaiDari = new Map(data.legenda.map((m) => [m.simbol, m.nilai]));
  const opsi = [...new Set(data.legenda.map((m) => m.nilai))]; // pilihan jawaban unik
  const totalPos = data.soal.reduce((n, s) => n + s.length, 0);

  const [soalIdx, setSoalIdx] = useState(0);
  const [posIdx, setPosIdx] = useState(0);
  const [isi, setIsi] = useState<string[]>([]);   // nilai terisi utk soal aktif
  const benarRef = useRef(0);
  const salahPosRef = useRef(false);              // ada salah di posisi ini? (utk skor first-try)
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);

  const soal = data.soal[soalIdx] ?? [];
  const simbolAktif = soal[posIdx];
  const benarNilai = simbolAktif ? nilaiDari.get(simbolAktif) : undefined;

  function tap(e: React.MouseEvent<HTMLButtonElement>, v: string) {
    const btn = e.currentTarget;
    if (v === benarNilai) {
      if (!salahPosRef.current) benarRef.current++;
      btn.classList.add('kp-pop'); speak('Hebat!');
      const isiBaru = [...isi]; isiBaru[posIdx] = v; setIsi(isiBaru);
      salahPosRef.current = false;
      setTimeout(() => {
        if (posIdx + 1 < soal.length) { setPosIdx(posIdx + 1); }
        else if (soalIdx + 1 < data.soal.length) { setSoalIdx(soalIdx + 1); setPosIdx(0); setIsi([]); }
        else onSelesai({ benar: benarRef.current, total: totalPos, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
      }, 550);
    } else {
      salahPosRef.current = true;
      btn.classList.add('kp-shake'); speak('Coba lagi ya');
      setTimeout(() => btn.classList.remove('kp-shake'), 450);
    }
  }

  if (!simbolAktif) return null;
  const pilihan = mix(opsi, soalIdx + posIdx + 1);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* legenda kode */}
      <div style={{ background: '#faf7ff', borderRadius: 18, padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {data.legenda.map((m) => (
          <span key={m.simbol} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', borderRadius: 12, padding: '4px 8px', boxShadow: '0 2px 0 #e6def5' }}>
            <Simbol v={m.simbol} size={26} /><b style={{ color: 'var(--abu)' }}>→</b><Simbol v={m.nilai} size={22} />
          </span>
        ))}
      </div>

      {/* sekuens soal aktif */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {soal.map((sim, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: i > posIdx ? 0.5 : 1 }}>
            <Simbol v={sim} size={44} />
            <div style={{ minWidth: 40, height: 40, borderRadius: 10, border: i === posIdx ? '3px solid var(--lavender-d)' : '2px dashed #cdbff0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
              {isi[i] ? <Simbol v={isi[i]} size={26} /> : (i === posIdx ? '❓' : '')}
            </div>
          </div>
        ))}
      </div>

      {/* pilihan nilai */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 4 }}>
        {pilihan.map((v, i) => (
          <button key={`${soalIdx}-${posIdx}-${i}`} onClick={(e) => tap(e, v)}
            style={{ background: '#fff', border: 'none', borderRadius: 16, minWidth: 56, minHeight: 56, padding: 8, boxShadow: '0 5px 0 #e6def5', cursor: 'pointer' }}>
            <Simbol v={v} size={30} />
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>Soal {soalIdx + 1}/{data.soal.length}</div>
    </div>
  );
}
