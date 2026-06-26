// src/app/komunitas/LaporBtn.tsx
'use client';
import { useState } from 'react';
import { lapor } from '@/lib/data/komunitas-actions';

export default function LaporBtn({ postinganId, komentarId }: { postinganId?: string; komentarId?: string }) {
  const [done, setDone] = useState(false);
  async function klik() {
    const alasan = window.prompt('Laporkan konten ini? Tulis alasan (opsional):');
    if (alasan === null) return; // batal
    try { await lapor({ postinganId, komentarId, alasan }); setDone(true); }
    catch { /* diam */ }
  }
  if (done) return <span style={{ color: 'var(--abu)', fontSize: 12 }}>dilaporkan ✓</span>;
  return <button onClick={klik} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--abu)', fontSize: 12, fontFamily: 'inherit' }}>Lapor</button>;
}
