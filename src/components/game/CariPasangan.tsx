// src/components/game/CariPasangan.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataCocok, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';

function mix<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  for (let k = 0; k < seed % a.length; k++) a.push(a.shift() as T);
  return a;
}

export default function CariPasangan({ data, onSelesai }: { data: DataCocok; onSelesai: (h: HasilSelesai) => void }) {
  const kartu = useMemo(() => mix([...data.pasangan, ...data.pasangan], 5), [data.pasangan]);
  const [terkunci, setTerkunci] = useState<number[]>([]);
  const [pilih, setPilih] = useState<number | null>(null);
  const cocokRef = useRef(0);
  const mulaiRef = useRef(0);
  const total = data.pasangan.length;

  useEffect(() => {
    mulaiRef.current = Date.now();
  }, []);

  function klik(i: number) {
    if (terkunci.includes(i) || pilih === i) return;
    if (pilih === null) { setPilih(i); return; }
    if (kartu[pilih] === kartu[i]) {
      const baru = [...terkunci, pilih, i];
      setTerkunci(baru); setPilih(null); cocokRef.current++;
      if (cocokRef.current >= total) {
        setTimeout(() => onSelesai({ benar: total, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) }), 400);
      }
    } else {
      setPilih(null);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 14, textAlign: 'center', fontWeight: 800, boxShadow: '0 4px 0 #e6def5' }}>🔎 Cari 2 gambar yang sama</div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignContent: 'center', padding: 14 }}>
        {kartu.map((emo, i) => {
          const lock = terkunci.includes(i);
          const sel = pilih === i;
          return (
            <button key={i} onClick={() => klik(i)}
              style={{ aspectRatio: '1', border: 'none', borderRadius: 20, fontSize: 42, cursor: lock ? 'default' : 'pointer',
                background: lock ? '#dff7ec' : '#fff',
                boxShadow: lock ? '0 5px 0 var(--mint-d)' : '0 5px 0 #e6def5',
                outline: sel ? '4px solid var(--biru-d)' : lock ? '3px solid var(--mint-d)' : 'none' }}>
              <Aset value={emo} size={42} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
