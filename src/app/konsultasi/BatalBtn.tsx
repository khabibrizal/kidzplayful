// src/app/konsultasi/BatalBtn.tsx — customer batalkan booking konsultasi
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { batalKonsultasi } from '@/lib/data/konsultasi-actions';

export default function BatalBtn({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function batal() {
    if (!confirm('Batalkan konsultasi ini?')) return;
    setBusy(true);
    const r = await batalKonsultasi(id);
    setBusy(false);
    if (r.ok) router.refresh(); else alert(r.error ?? 'Gagal');
  }
  return (
    <button onClick={batal} disabled={busy} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 12, fontWeight: 700 }}>
      {busy ? '...' : 'Batalkan'}
    </button>
  );
}
