// src/components/RekamAktivitas.tsx — perekam aktivitas buka fitur (client, 1x saat mount)
'use client';
import { useEffect, useRef } from 'react';
import { catatAktivitas } from '@/lib/data/aktivitas-actions';

export default function RekamAktivitas({ fitur, anakId }: { fitur: string; anakId?: string }) {
  const sudah = useRef(false);
  useEffect(() => {
    if (sudah.current) return;
    sudah.current = true;
    catatAktivitas(fitur, anakId).catch(() => {});
  }, [fitur, anakId]);
  return null;
}
