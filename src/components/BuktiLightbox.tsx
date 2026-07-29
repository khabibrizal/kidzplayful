// src/components/BuktiLightbox.tsx — lihat bukti bayar / nota sebagai MODAL di halaman yang sama
// (bukan tab baru). Client leaf: aman dirender dari Server Component.
'use client';
import { useEffect, useState } from 'react';

export default function BuktiLightbox({
  url, label = '📎 Bukti bayar', judul = 'Bukti pembayaran', variant = 'tombol',
}: {
  url: string;
  label?: string;
  judul?: string;
  variant?: 'tombol' | 'tautan' | 'thumb';
}) {
  const [buka, setBuka] = useState(false);
  const pdf = /\.pdf($|\?)/i.test(url);

  // tutup dengan tombol Escape
  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBuka(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buka]);

  const gaya: Record<string, React.CSSProperties> = {
    tombol: { border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, padding: '7px 12px', borderRadius: 999, background: '#efe7fb', color: 'var(--lavender-d)' },
    tautan: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--biru-d)', textDecoration: 'underline' },
    thumb: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 },
  };

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} style={gaya[variant]} title={judul}>
        {variant === 'thumb'
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt={judul} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
          : label}
      </button>

      {buka && (
        <div onClick={() => setBuka(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '92vw', maxHeight: '90vh', background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,.4)' }}>
            <button type="button" aria-label="Tutup" onClick={() => setBuka(false)} style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 99, border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', padding: '10px 14px' }}>🧾 {judul}</div>
            {pdf
              ? <iframe src={url} title={judul} style={{ width: '90vw', maxWidth: 700, height: '80vh', border: 'none' }} />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={url} alt={judul} style={{ display: 'block', maxWidth: '92vw', maxHeight: '80vh', objectFit: 'contain' }} />}
            <div style={{ padding: '8px 14px', textAlign: 'right' }}>
              <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--biru-d)' }}>Buka di tab baru ↗</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
