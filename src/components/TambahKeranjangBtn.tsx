// src/components/TambahKeranjangBtn.tsx
'use client';
import { useState, useTransition } from 'react';
import { tambahKeranjang } from '@/lib/data/keranjang-actions';

export default function TambahKeranjangBtn({ produkId, habis }: { produkId: string; habis?: boolean }) {
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  const gaya: React.CSSProperties = { marginTop: 6, width: '100%', padding: '9px 10px', fontSize: 13.5 };
  if (habis) {
    return <button className="kp-btn" disabled style={{ ...gaya, background: '#f0ecf9', color: 'var(--abu)', boxShadow: 'none' }}>Stok habis</button>;
  }
  function klik() {
    start(async () => {
      try { await tambahKeranjang(produkId, 1); window.dispatchEvent(new Event('keranjang:update')); setOk(true); setTimeout(() => setOk(false), 1400); } catch { /* abaikan */ }
    });
  }
  return (
    <button className="kp-btn" onClick={klik} disabled={pending} style={{ ...gaya, boxShadow: '0 4px 0 #7d63b8' }}>
      {ok ? '✓ Ditambah' : '+ Keranjang'}
    </button>
  );
}
