// src/components/HapusItemBtn.tsx — hapus rekomendasi item (psikolog/guru)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { hapusRekomendasiItem } from '@/lib/data/rekomendasi-item-actions';

export default function HapusItemBtn({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function hapus() {
    if (!confirm('Hapus rekomendasi ini?')) return;
    setBusy(true);
    const r = await hapusRekomendasiItem(id);
    setBusy(false);
    if (r.ok) router.refresh(); else alert(r.error ?? 'Gagal');
  }
  return (
    <button onClick={hapus} disabled={busy} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 12, fontWeight: 700 }}>
      {busy ? '...' : 'Hapus'}
    </button>
  );
}
