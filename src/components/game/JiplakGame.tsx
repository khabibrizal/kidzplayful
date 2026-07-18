// src/components/game/JiplakGame.tsx — engine "Jiplak Huruf & Angka" (calistung TULIS, motorik halus)
// Anak menyeret jari mengikuti jalur goresan karakter (JALUR_KARAKTER). Toleransi longgar,
// keluar jalur tidak dihukum — jejak berhenti dan anak lanjut dari titik terakhir.
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataJiplak, HasilSelesai } from '@/lib/game/tipe';
import { JALUR_KARAKTER, rapatkan, type Titik } from '@/lib/game/jiplak-path';
import { speak, bunyikan } from '@/lib/tts';

const TOL = 11;          // radius toleransi (unit viewBox) — longgar utk usia 3 th
const LIHAT_DEPAN = 6;   // lookahead titik utk kemajuan
const MAKS_SLIP = 3;     // keluar-jalur ≤ 3 kali masih dihitung "benar" (rapi)
const ANGKA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
const namaKarakter = (c: string) => (/\d/.test(c) ? ANGKA[Number(c)] : c);

const d = (a: Titik, b: Titik) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const poly = (pts: Titik[]) => pts.map((p) => p.join(',')).join(' ');

export default function JiplakGame({ data, onSelesai }: { data: DataJiplak; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const [gor, setGor] = useState(0);       // goresan aktif
  const [idx, setIdx] = useState(0);       // progres titik pada goresan aktif
  const [selesaiKar, setSelesaiKar] = useState(false);
  const gambarRef = useRef(false);         // sedang menyeret
  const slipRef = useRef(0);
  const keluarRef = useRef(false);         // debounce hitung slip
  const benarRef = useRef(0);
  const salahTotalRef = useRef(false);
  const mulaiRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);

  const soal = data.soal[ronde];
  const strokes = useMemo(() => (soal ? (JALUR_KARAKTER[soal.karakter] ?? []) : []), [soal]);
  const pts = useMemo(() => (strokes[gor] ? rapatkan(strokes[gor]) : []), [strokes, gor]);

  useEffect(() => {
    if (soal) { const t = setTimeout(() => speak(`Ayo jiplak ${namaKarakter(soal.karakter)}`), 400); return () => clearTimeout(t); }
  }, [ronde, soal]);

  if (!soal || strokes.length === 0) return null;

  function kePosisi(e: React.PointerEvent): Titik {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 140];
  }

  function turun(e: React.PointerEvent) {
    if (selesaiKar) return;
    const p = kePosisi(e);
    const target = pts[Math.min(idx, pts.length - 1)];
    if (d(p, target) < TOL * 1.4) { gambarRef.current = true; keluarRef.current = false; }
  }

  function gerak(e: React.PointerEvent) {
    if (!gambarRef.current || selesaiKar) return;
    const p = kePosisi(e);
    // maju bila dekat salah satu titik di depan (lookahead)
    let maju = -1;
    for (let k = 0; k <= LIHAT_DEPAN && idx + k < pts.length; k++) {
      if (d(p, pts[idx + k]) < TOL) { maju = idx + k; }
    }
    if (maju >= 0) {
      keluarRef.current = false;
      if (maju !== idx) setIdx(maju);
      if (maju >= pts.length - 1) goresanSelesai();
    } else if (d(p, pts[Math.min(idx, pts.length - 1)]) > TOL * 2) {
      if (!keluarRef.current) { keluarRef.current = true; slipRef.current++; } // hitung 1× per keluar jalur
    }
  }

  function lepas() { gambarRef.current = false; }

  function goresanSelesai() {
    gambarRef.current = false;
    if (gor + 1 < strokes.length) { speak('Bagus!'); setGor(gor + 1); setIdx(0); return; }
    // semua goresan selesai → karakter menyala
    setSelesaiKar(true);
    const rapi = slipRef.current <= MAKS_SLIP;
    if (!rapi) salahTotalRef.current = true; else benarRef.current++;
    bunyikan(namaKarakter(soal.karakter), soal.audio_url);
    setTimeout(() => speak('Hebat!'), 700);
    setTimeout(() => {
      if (ronde + 1 >= data.soal.length) onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
      else { setRonde(ronde + 1); setGor(0); setIdx(0); setSelesaiKar(false); slipRef.current = 0; salahTotalRef.current = false; }
    }, 1500);
  }

  // panah arah: dari titik progres ke beberapa titik di depan
  const a0 = pts[Math.min(idx, pts.length - 1)];
  const a1 = pts[Math.min(idx + 4, pts.length - 1)];
  const sudut = a0 && a1 ? (Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) * 180) / Math.PI : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>Seret jarimu dari titik hijau, ikuti jalurnya ya! ✍️</div>
      <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 6px 0 #e6def5', padding: 10 }}>
        <svg ref={svgRef} viewBox="0 0 100 140" width={250} height={350} style={{ touchAction: 'none', display: 'block' }}
          onPointerDown={turun} onPointerMove={gerak} onPointerUp={lepas} onPointerLeave={lepas}>
          {/* semua goresan: panduan putus-putus / selesai solid */}
          {strokes.map((s, i) => (
            <polyline key={i} points={poly(rapatkan(s))} fill="none"
              stroke={selesaiKar ? 'var(--mint-d, #2e9e63)' : i < gor ? 'var(--mint-d, #2e9e63)' : '#d8cff0'}
              strokeWidth={selesaiKar || i < gor ? 9 : 7} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={selesaiKar || i < gor ? undefined : '2.5 6'} />
          ))}
          {/* jejak goresan aktif */}
          {!selesaiKar && idx > 0 && (
            <polyline points={poly(pts.slice(0, idx + 1))} fill="none" stroke="var(--lavender-d, #6b4fb0)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {/* titik mulai + panah arah */}
          {!selesaiKar && a0 && (
            <g>
              <circle cx={a0[0]} cy={a0[1]} r={6.5} fill="#2e9e63" opacity={0.9}>
                <animate attributeName="r" values="5.5;7.5;5.5" dur="1s" repeatCount="indefinite" />
              </circle>
              <g transform={`translate(${a1[0]},${a1[1]}) rotate(${sudut})`}>
                <path d="M -2 -4 L 5 0 L -2 4 Z" fill="#2e9e63" opacity={0.85} />
              </g>
            </g>
          )}
        </svg>
      </div>
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>
        goresan {Math.min(gor + 1, strokes.length)}/{strokes.length} · soal {ronde + 1}/{data.soal.length}
      </div>
    </div>
  );
}
