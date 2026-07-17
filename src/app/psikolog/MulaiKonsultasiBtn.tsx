// src/app/psikolog/MulaiKonsultasiBtn.tsx — psikolog memulai sesi (mulai hitung mundur durasi)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mulaiKonsultasi } from '@/lib/data/psikolog-actions';

export default function MulaiKonsultasiBtn({ id, durasiMenit }: { id: string; durasiMenit: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function mulai() {
    if (!confirm(`Mulai konsultasi? Waktu ${durasiMenit} menit akan berjalan dan chat otomatis selesai saat habis.`)) return;
    setBusy(true);
    const r = await mulaiKonsultasi(id);
    setBusy(false);
    if (r.ok) router.refresh(); else alert(r.error ?? 'Gagal memulai');
  }
  return (
    <button className="kp-btn mint" onClick={mulai} disabled={busy} style={{ padding: '8px 16px' }}>
      {busy ? '...' : `▶ Mulai Konsultasi (${durasiMenit} menit)`}
    </button>
  );
}
