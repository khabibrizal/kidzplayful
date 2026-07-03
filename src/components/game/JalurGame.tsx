// src/components/game/JalurGame.tsx — engine "Arah & Jalur" (robot grid / coding)
// Anak menyusun urutan perintah arah, lalu "Jalan" — karakter berjalan ke tujuan.
'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataJalur, HasilSelesai } from '@/lib/game/tipe';
import { speak } from '@/lib/tts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ARAH: { k: string; ic: string; dx: number; dy: number }[] = [
  { k: 'atas', ic: '⬆️', dx: 0, dy: -1 },
  { k: 'kiri', ic: '⬅️', dx: -1, dy: 0 },
  { k: 'kanan', ic: '➡️', dx: 1, dy: 0 },
  { k: 'bawah', ic: '⬇️', dx: 0, dy: 1 },
];
const ic = (k: string) => ARAH.find((a) => a.k === k)?.ic ?? '?';

export default function JalurGame({ data, onSelesai }: { data: DataJalur; onSelesai: (h: HasilSelesai) => void }) {
  const [soalIdx, setSoalIdx] = useState(0);
  const soal = data.soal[soalIdx];
  const [program, setProgram] = useState<string[]>([]);
  const [pos, setPos] = useState<[number, number]>(soal ? [soal.mulai[0], soal.mulai[1]] : [0, 0]);
  const [running, setRunning] = useState(false);
  const [pesan, setPesan] = useState('');
  const benarRef = useRef(0);
  const gagalRef = useRef(false);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  useEffect(() => {
    if (soal) { setProgram([]); setPos([soal.mulai[0], soal.mulai[1]]); setPesan(''); gagalRef.current = false; setRunning(false); }
  }, [soalIdx, soal]);
  if (!soal) return null;

  const { kolom, baris } = soal;
  const rint = soal.rintangan ?? [];
  const isRint = (x: number, y: number) => rint.some((r) => r[0] === x && r[1] === y);
  const cell = Math.max(30, Math.min(60, Math.floor(300 / Math.max(kolom, baris))));

  async function jalan() {
    if (running || program.length === 0) return;
    setRunning(true); setPesan('');
    let cx = soal.mulai[0], cy = soal.mulai[1]; setPos([cx, cy]);
    for (const cmd of program) {
      await sleep(430);
      const a = ARAH.find((z) => z.k === cmd)!;
      const nx = cx + a.dx, ny = cy + a.dy;
      if (nx < 0 || ny < 0 || nx >= kolom || ny >= baris || isRint(nx, ny)) {
        gagalRef.current = true; speak('Aduh, ke luar jalur!'); setPesan('Ups! rutenya keluar — ubah ya 🙂');
        await sleep(800); setPos([soal.mulai[0], soal.mulai[1]]); setPesan(''); setRunning(false); return;
      }
      cx = nx; cy = ny; setPos([cx, cy]);
    }
    await sleep(250);
    if (cx === soal.tujuan[0] && cy === soal.tujuan[1]) {
      speak('Hebat!'); if (!gagalRef.current) benarRef.current++;
      setPesan('Sampai tujuan! 🎉'); await sleep(950);
      if (soalIdx + 1 >= data.soal.length) onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
      else setSoalIdx(soalIdx + 1);
    } else {
      gagalRef.current = true; speak('Hampir!'); setPesan('Belum sampai tujuan, coba lagi 💪');
      await sleep(800); setPos([soal.mulai[0], soal.mulai[1]]); setPesan(''); setRunning(false);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div style={{ color: 'var(--abu)', fontSize: 13, textAlign: 'center' }}>Susun perintah arah lalu tekan <b>Jalan</b> agar {soal.karakter ?? '🐢'} sampai ke {soal.hadiah ?? '🎯'}</div>

      {/* grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kolom}, ${cell}px)`, gap: 4, justifyContent: 'center', background: '#efe7fb', padding: 6, borderRadius: 14 }}>
        {Array.from({ length: baris * kolom }).map((_, i) => {
          const x = i % kolom, y = Math.floor(i / kolom);
          const isChar = pos[0] === x && pos[1] === y;
          const isGoal = soal.tujuan[0] === x && soal.tujuan[1] === y;
          const ob = isRint(x, y);
          return (
            <div key={i} style={{ width: cell, height: cell, borderRadius: 8, background: ob ? '#cdbff0' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cell * 0.58, transition: 'background .15s' }}>
              {isChar ? (soal.karakter ?? '🐢') : isGoal ? (soal.hadiah ?? '🎯') : ob ? '🧱' : ''}
            </div>
          );
        })}
      </div>

      {/* program tersusun */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', minHeight: 40, background: '#fff', borderRadius: 12, padding: '6px 10px', boxShadow: '0 3px 0 #e6def5', minWidth: 200 }}>
        {program.length === 0 ? <span style={{ color: 'var(--abu)', fontSize: 13, alignSelf: 'center' }}>(tekan tombol arah di bawah)</span>
          : program.map((c, i) => <span key={i} style={{ fontSize: 24 }}>{ic(c)}</span>)}
      </div>

      {/* tombol arah */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 8 }}>
        {ARAH.map((a) => (
          <button key={a.k} onClick={() => setProgram((p) => [...p, a.k])} disabled={running}
            style={{ background: '#fff', border: 'none', borderRadius: 14, width: 54, height: 54, fontSize: 26, boxShadow: '0 5px 0 #e6def5', cursor: running ? 'default' : 'pointer' }}>{a.ic}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="kp-btn putih" onClick={() => setProgram((p) => p.slice(0, -1))} disabled={running || program.length === 0}>⌫ Hapus</button>
        <button className="kp-btn putih" onClick={() => { setProgram([]); setPos([soal.mulai[0], soal.mulai[1]]); setPesan(''); }} disabled={running}>↺ Ulang</button>
        <button className="kp-btn" onClick={jalan} disabled={running || program.length === 0} style={running || program.length === 0 ? { opacity: 0.5 } : undefined}>▶ Jalan</button>
      </div>

      {pesan && <div style={{ fontWeight: 700, color: 'var(--lavender-d)' }}>{pesan}</div>}
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>{soalIdx + 1}/{data.soal.length}</div>
    </div>
  );
}
