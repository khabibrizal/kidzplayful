// src/components/game/IngatanGame.tsx — Kartu Ingatan (memory / concentration)
// Kartu mulai TERTUTUP. Anak buka 2 kartu; bila sama → tetap terbuka, bila beda → tertutup lagi.
// Melatih working memory. Selesai saat semua pasangan ketemu.
'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataIngatan, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';

function acak<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function IngatanGame({ data, onSelesai }: { data: DataIngatan; onSelesai: (h: HasilSelesai) => void }) {
  const item = data.pasangan.filter(Boolean);
  const total = item.length;
  const [kartu] = useState<string[]>(() => acak([...item, ...item])); // dek = tiap item ×2, teracak (sekali saat mount)
  const [buka, setBuka] = useState<number[]>([]);   // indeks kartu yang sedang dibuka (maks 2)
  const [cocok, setCocok] = useState<number[]>([]); // indeks kartu yang sudah dipasangkan
  const [sibuk, setSibuk] = useState(false);        // kunci input saat menunggu kartu menutup kembali
  const mulaiRef = useRef(0);

  useEffect(() => { mulaiRef.current = Date.now(); }, []);

  function klik(i: number) {
    if (sibuk || buka.includes(i) || cocok.includes(i)) return;
    const baru = [...buka, i];
    setBuka(baru);
    if (baru.length < 2) return;
    const [a, b] = baru;
    if (kartu[a] === kartu[b]) {
      const ck = [...cocok, a, b];
      setCocok(ck); setBuka([]);
      if (ck.length >= kartu.length) {
        setTimeout(() => onSelesai({ benar: total, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) }), 500);
      }
    } else {
      setSibuk(true);
      setTimeout(() => { setBuka([]); setSibuk(false); }, 900); // tutup lagi setelah jeda
    }
  }

  const deck = kartu.length;
  const cols = deck <= 6 ? 2 : deck <= 12 ? 3 : 4;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 14, textAlign: 'center', fontWeight: 800, boxShadow: '0 4px 0 #e6def5' }}>🧠 Buka 2 kartu, cari yang sama!</div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, alignContent: 'center', padding: 14 }}>
        {kartu.map((emo, i) => {
          const lock = cocok.includes(i);
          const terbuka = lock || buka.includes(i);
          return (
            <button key={i} onClick={() => klik(i)} disabled={lock}
              style={{ aspectRatio: '1', border: 'none', borderRadius: 20, cursor: lock ? 'default' : 'pointer',
                background: lock ? '#dff7ec' : terbuka ? '#fff' : '#a892e6',
                boxShadow: lock ? '0 5px 0 var(--mint-d)' : '0 5px 0 #e6def5',
                outline: lock ? '3px solid var(--mint-d)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
              {terbuka ? <Aset value={emo} size={42} /> : <span style={{ fontSize: 34, color: '#fff' }}>❓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
