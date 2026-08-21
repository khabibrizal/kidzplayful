// src/components/WorksheetBtn.tsx — tombol unduh worksheet yang menghormati kuota paket.
//
// Sengaja BUKAN tautan `<a href>`: kalau URL berkasnya dirender langsung, kuota hanya hiasan
// karena tautannya bisa diklik berulang atau disalin. URL baru diberikan server setelah kuota
// diperiksa & dicatat (`mintaWorksheet`).
'use client';
import { useState } from 'react';
import { mintaWorksheet } from '@/lib/data/worksheet-actions';

export default function WorksheetBtn({ kelasId, sisaAwal, tanpaBatas, terbuka }: {
  kelasId: string;
  /** sisa kuota sebelum unduhan ini (null = tanpa batas / tak relevan) */
  sisaAwal?: number | null;
  tanpaBatas?: boolean;
  /** materi ini ditandai admin sebagai contoh gratis → tak memakai kuota */
  terbuka?: boolean;
}) {
  const [sibuk, setSibuk] = useState(false);
  const [sisa, setSisa] = useState<number | null | undefined>(sisaAwal);
  const [galat, setGalat] = useState('');

  async function unduh() {
    if (sibuk) return;
    setSibuk(true); setGalat('');
    const r = await mintaWorksheet(kelasId);
    setSibuk(false);
    if (!r.ok || !r.url) { setGalat(r.error ?? 'Gagal mengambil worksheet.'); return; }
    if (!terbuka && !tanpaBatas) setSisa(r.sisa ?? 0);
    window.open(r.url, '_blank', 'noopener,noreferrer');
  }

  const habis = !terbuka && !tanpaBatas && typeof sisa === 'number' && sisa <= 0;

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      <button className="kp-btn putih" onClick={unduh} disabled={sibuk || habis}
        style={{ display: 'inline-block', opacity: habis ? 0.6 : 1, cursor: habis ? 'not-allowed' : 'pointer' }}
        title={habis ? 'Kuota unduh worksheet sudah habis' : undefined}>
        {sibuk ? 'Menyiapkan…' : habis ? '🔒 Worksheet (kuota habis)' : '📄 Worksheet'}
      </button>
      {terbuka
        ? <small style={{ fontSize: 10, color: 'var(--mint-d)' }}>contoh gratis</small>
        : !tanpaBatas && typeof sisa === 'number'
          ? <small style={{ fontSize: 10, color: 'var(--abu)' }}>sisa {sisa} unduhan</small>
          : null}
      {galat && <small style={{ fontSize: 11, color: '#c0392b', maxWidth: 260 }}>{galat}</small>}
    </span>
  );
}
