// src/components/TambahKeranjangBtn.tsx
'use client';
import { useState, useTransition } from 'react';
import { tambahKeranjang } from '@/lib/data/keranjang-actions';

export default function TambahKeranjangBtn({ produkId, habis }: { produkId: string; habis?: boolean }) {
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (habis) {
    return <button className="kp-btn" disabled style={{ marginTop: 6, width: '100%', background: '#f0ecf9', color: 'var(--abu)', boxShadow: 'none' }}>Stok habis</button>;
  }
  function klik() {
    start(async () => {
      try { await tambahKeranjang(produkId, 1); setOk(true); setTimeout(() => setOk(false), 1400); } catch { /* abaikan */ }
    });
  }
  return (
    <button className="kp-btn" onClick={klik} disabled={pending} style={{ marginTop: 6, width: '100%' }}>
      {ok ? '✓ Ditambah' : '+ Keranjang'}
    </button>
  );
}
