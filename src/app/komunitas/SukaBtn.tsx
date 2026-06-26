// src/app/komunitas/SukaBtn.tsx
'use client';
import { useState, useTransition } from 'react';
import { toggleSuka } from '@/lib/data/komunitas-actions';

export default function SukaBtn({ postId, awalSuka, awalJml }: { postId: string; awalSuka: boolean; awalJml: number }) {
  const [suka, setSuka] = useState(awalSuka);
  const [jml, setJml] = useState(awalJml);
  const [pending, start] = useTransition();
  function klik() {
    setSuka(!suka); setJml(jml + (suka ? -1 : 1));
    start(() => { toggleSuka(postId); });
  }
  return (
    <button onClick={klik} disabled={pending} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: suka ? '#e0445b' : 'var(--abu)', fontFamily: 'inherit' }}>
      {suka ? '❤️' : '🤍'} {jml}
    </button>
  );
}
