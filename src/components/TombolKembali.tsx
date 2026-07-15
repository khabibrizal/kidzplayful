// src/components/TombolKembali.tsx — tombol "Kembali" ke halaman sebelumnya (riwayat browser)
// Bila tak ada riwayat dalam app (mis. halaman dibuka langsung / di-refresh) → fallback ke href.
'use client';
import { useRouter } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

export default function TombolKembali({ fallback = '/', label, className, style }: {
  fallback?: string;
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const router = useRouter();
  function kembali(e: React.MouseEvent) {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(fallback);
  }
  return (
    <a href={fallback} onClick={kembali} className={className} style={style}>{label ?? '← Kembali'}</a>
  );
}
