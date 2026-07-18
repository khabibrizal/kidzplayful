// src/components/game/HitungBendaGame.tsx — engine "Hitung Benda" (calistung HITUNG, number sense)
// Mode 'hitung': tap benda satu-satu sambil dihitung bersuara, lalu pilih angkanya.
// Mode 'banyak-mana': bandingkan dua kelompok, tap yang lebih banyak.
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataHitungBenda, HitungBendaSoal, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';
import { speak, bunyikan } from '@/lib/tts';

const ANGKA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'];

function acak<T>(arr: T[], seed: number): T[] {
  return arr.map((v, i) => ({ v, k: ((i + 1) * 9301 + seed * 49297) % 233 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}
function opsiAngka(ans: number, seed: number): number[] {
  const set = new Set<number>([ans]);
  let d = 1;
  while (set.size < 4 && d <= 8) { if (ans - d >= 1) set.add(ans - d); if (set.size < 4 && ans + d <= 12) set.add(ans + d); d++; }
  return acak([...set], seed);
}
// posisi acak-rapi (grid ber-jitter deterministik) agar benda tak bertumpuk
function posisi(n: number, seed: number): { x: number; y: number }[] {
  const kolom = n <= 4 ? 2 : n <= 6 ? 3 : 4;
  const baris = Math.ceil(n / kolom);
  const idx = acak(Array.from({ length: n }, (_, i) => i), seed);
  return idx.map((i, k) => {
    const c = i % kolom, r = Math.floor(i / kolom);
    const jx = (((k + 1) * 37 + seed * 13) % 11) - 5, jy = (((k + 2) * 53 + seed * 7) % 11) - 5;
    return { x: (c + 0.5) * (100 / kolom) + jx * 0.6, y: (r + 0.5) * (100 / baris) + jy * 0.6 };
  });
}

function KelompokBenda({ soal, tanda, onTap }: { soal: { benda: string; jumlah: number }; tanda: Set<number>; onTap?: (i: number) => void }) {
  const pos = useMemo(() => posisi(soal.jumlah, soal.jumlah * 3 + 1), [soal]);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {pos.map((p, i) => {
        const ke = [...tanda].indexOf(i); // urutan tap (badge angka)
        const ditandai = tanda.has(i);
        return (
          <button key={i} onClick={onTap ? () => onTap(i) : undefined} disabled={!onTap || ditandai}
            style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%,-50%) scale(${ditandai ? 1.25 : 1})`, transition: 'transform .2s', background: 'none', border: 'none', cursor: onTap && !ditandai ? 'pointer' : 'default', padding: 4 }}>
            <Aset value={soal.benda} size={44} />
            {ditandai && (
              <span style={{ position: 'absolute', top: -10, right: -8, minWidth: 22, height: 22, borderRadius: 99, background: 'var(--mint-d)', color: '#fff', fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', border: '2px solid #fff' }}>{ke + 1}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function HitungBendaGame({ data, onSelesai }: { data: DataHitungBenda; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const [tanda, setTanda] = useState<Set<number>>(new Set());
  const benarRef = useRef(0);
  const salahRef = useRef(false);
  const mulaiRef = useRef(0);
  useEffect(() => { mulaiRef.current = Date.now(); }, []);
  const soal: HitungBendaSoal | undefined = data.soal[ronde];
  const semuaTertandai = !!soal && soal.mode === 'hitung' && tanda.size >= soal.jumlah;
  const opsi = useMemo(() => (soal && soal.mode === 'hitung' ? opsiAngka(soal.jumlah, ronde + 6) : []), [soal, ronde]);

  useEffect(() => {
    if (soal?.mode === 'banyak-mana') { const t = setTimeout(() => bunyikan('Mana yang lebih banyak?', soal.audio_url), 400); return () => clearTimeout(t); }
  }, [ronde, soal]);

  if (!soal) return null;
  const sq = soal; // narrowing utk closure di bawah

  function lanjut() {
    if (!salahRef.current) benarRef.current++;
    speak('Hebat!');
    setTimeout(() => {
      if (ronde + 1 >= data.soal.length) onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
      else { setRonde(ronde + 1); setTanda(new Set()); salahRef.current = false; }
    }, 900);
  }

  function tapBenda(i: number) {
    if (tanda.has(i)) return;
    const n = new Set(tanda); n.add(i); setTanda(n);
    speak(ANGKA[n.size] ?? String(n.size));
  }

  function pilihAngka(e: React.MouseEvent<HTMLButtonElement>, n: number) {
    const btn = e.currentTarget;
    if (n === sq.jumlah) { btn.classList.add('kp-pop'); lanjut(); }
    else { salahRef.current = true; btn.classList.add('kp-shake'); speak('Coba hitung lagi ya'); setTimeout(() => btn.classList.remove('kp-shake'), 450); }
  }

  function pilihKelompok(e: React.MouseEvent<HTMLButtonElement>, yangDipilih: number) {
    const btn = e.currentTarget;
    const benar = (sq.jumlah > (sq.jumlah2 ?? 0)) ? 1 : 2;
    if (yangDipilih === benar) { btn.classList.add('kp-pop'); lanjut(); }
    else { salahRef.current = true; btn.classList.add('kp-shake'); speak('Coba lihat lagi, mana yang lebih banyak?'); setTimeout(() => btn.classList.remove('kp-shake'), 450); }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ color: 'var(--abu)', fontSize: 13, textAlign: 'center' }}>
        {soal.mode === 'hitung'
          ? (semuaTertandai ? 'Ada berapa semuanya? Pilih angkanya! 🔢' : 'Ketuk bendanya satu-satu sambil dihitung ya! 👆')
          : 'Ketuk kelompok yang lebih banyak! 👀'}
      </div>

      {soal.mode === 'hitung' ? (
        <>
          <div style={{ width: 'min(92vw, 360px)', height: 240, background: '#fff', borderRadius: 24, boxShadow: '0 6px 0 #e6def5', padding: 8 }}>
            <KelompokBenda soal={{ benda: soal.benda, jumlah: soal.jumlah }} tanda={tanda} onTap={tapBenda} />
          </div>
          {semuaTertandai && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {opsi.map((n, i) => (
                <button key={`${ronde}-${i}`} onClick={(e) => pilihAngka(e, n)}
                  style={{ background: '#fff', border: 'none', borderRadius: 16, minWidth: 60, minHeight: 60, fontSize: 26, fontWeight: 800, color: 'var(--lavender-d)', boxShadow: '0 6px 0 #e6def5', cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', gap: 12, width: 'min(92vw, 400px)' }}>
          {[{ benda: soal.benda, jumlah: soal.jumlah, ke: 1 }, { benda: soal.benda2 ?? soal.benda, jumlah: soal.jumlah2 ?? 0, ke: 2 }].map((g) => (
            <button key={g.ke} onClick={(e) => pilihKelompok(e, g.ke)}
              style={{ flex: 1, height: 220, background: '#fff', border: 'none', borderRadius: 20, boxShadow: '0 6px 0 #e6def5', cursor: 'pointer', padding: 6 }}>
              <KelompokBenda soal={{ benda: g.benda, jumlah: g.jumlah }} tanda={new Set()} />
            </button>
          ))}
        </div>
      )}
      <div style={{ color: 'var(--abu)', fontSize: 13 }}>{ronde + 1}/{data.soal.length}</div>
    </div>
  );
}
