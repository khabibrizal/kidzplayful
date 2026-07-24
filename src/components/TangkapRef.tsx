// src/components/TangkapRef.tsx — tangkap UTM share (first-touch) saat pengunjung landing. Render null.
'use client';
import { useEffect } from 'react';
import { simpanRefDariUrl } from '@/lib/ref';

export default function TangkapRef() {
  useEffect(() => {
    try { simpanRefDariUrl(new URLSearchParams(window.location.search)); } catch { /* abaikan */ }
  }, []);
  return null;
}
