// src/components/game/IngatanGame.tsx — Kartu Ingatan (memory / concentration)
// Kartu mulai TERTUTUP. Anak buka 2 kartu; bila sepasang → tetap terbuka, bila beda → tertutup lagi.
// Melatih working memory. Selesai saat semua pasangan ketemu.
'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataIngatan, HasilSelesai } from '@/lib/game/tipe';
import Aset from './Aset';

type Kartu = { id: number; aset: string }; // id = indeks entri asal → dua salinan berbagi id yg sama

function acak<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Normalisasi ke daftar pasangan {a,b}. String (data lama) → self-pair (a=b).
// b kosong → kartu ke-2 = a (1 gambar jadi sepasang).
function normPasangan(raw: DataIngatan['pasangan']): { a: string; b: string }[] {
  return (raw ?? [])
    .map((p) => typeof p === 'string' ? { a: p, b: p } : { a: p.a ?? '', b: (p.b && p.b.trim()) ? p.b : (p.a ?? '') })
    .filter((p) => p.a && p.a.trim());
}

export default function IngatanGame({ data, onSelesai }: { data: DataIngatan; onSelesai: (h: HasilSelesai) => void }) {
  const pasangan = normPasangan(data.pasangan);
  const total = pasangan.length;
  // dek = tiap pasangan → 2 kartu (kartu-1=a, kartu-2=b) berbagi id, lalu diacak sekali saat mount
  const [kartu] = useState<Kartu[]>(() => acak(pasangan.flatMap((p, id) => [{ id, aset: p.a }, { id, aset: p.b }])));
  const [buka, setBuka] = useState<number[]>([]);   // indeks kartu yang sedang dibuka (maks 2)
  const [cocok, setCocok] = useState<number[]>([]); // indeks kartu yang sudah dipasangkan
  const [sibuk, setSibuk] = useState(false);        // kunci input saat menunggu kartu menutup kembali
  const mulaiRef = useRef(0);

  useEffect(() => { mulaiRef.current = Date.now(); }, []);

  // dua kartu cocok bila dari PASANGAN yang sama (id sama)
  function sepasang(a: number, b: number): boolean {
    return kartu[a].id === kartu[b].id;
  }

  // Klik HANYA menambah kartu ke `buka` (functional updater → bebas dari stale closure
  // saat anak menekan cepat / double-tap). Evaluasi pasangan dilakukan di useEffect.
  function klik(i: number) {
    setBuka((prev) => (sibuk || prev.length >= 2 || prev.includes(i) || cocok.includes(i)) ? prev : [...prev, i]);
  }

  // Saat 2 kartu terbuka → nilai cocok/tidak (race-free).
  useEffect(() => {
    if (buka.length !== 2) return;
    const [a, b] = buka;
    if (sepasang(a, b)) {
      setCocok((ck) => {
        const nc = [...ck, a, b];
        if (nc.length >= kartu.length) {
          setTimeout(() => onSelesai({ benar: total, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) }), 500);
        }
        return nc;
      });
      setBuka([]);
    } else {
      setSibuk(true);
      const t = setTimeout(() => { setBuka([]); setSibuk(false); }, 900); // tutup lagi setelah jeda
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buka]);

  const deck = kartu.length;
  const cols = deck <= 6 ? 2 : deck <= 12 ? 3 : deck <= 24 ? 4 : deck <= 40 ? 5 : 6; // grid menyesuaikan jumlah kartu

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 14, textAlign: 'center', fontWeight: 800, boxShadow: '0 4px 0 #e6def5' }}>🧠 Buka 2 kartu, cari yang sama!</div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, alignContent: 'center', padding: 14 }}>
        {kartu.map((k, i) => {
          const lock = cocok.includes(i);
          const terbuka = lock || buka.includes(i);
          return (
            <button key={i} onClick={() => klik(i)} disabled={lock}
              style={{ aspectRatio: '1', border: 'none', borderRadius: 20, cursor: lock ? 'default' : 'pointer',
                background: lock ? '#dff7ec' : terbuka ? '#fff' : '#a892e6',
                boxShadow: lock ? '0 5px 0 var(--mint-d)' : '0 5px 0 #e6def5',
                outline: lock ? '3px solid var(--mint-d)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
              {terbuka ? <Aset value={k.aset} size={42} /> : <span style={{ fontSize: 34, color: '#fff' }}>❓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
