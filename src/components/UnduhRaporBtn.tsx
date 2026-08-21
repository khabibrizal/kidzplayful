// src/components/UnduhRaporBtn.tsx — unduh rapor bulanan sebagai JPEG A4 landscape.
'use client';
import { useState } from 'react';
import { buatRaporJpeg, type IsiRapor } from '@/lib/rapor-jpeg';

export default function UnduhRaporBtn({ isi }: { isi: IsiRapor }) {
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');

  async function unduh() {
    if (sibuk) return;
    setSibuk(true); setPesan('');
    try {
      const blob = await buatRaporJpeg(isi);
      const nama = `rapor-${isi.namaAnak.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${isi.periode.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nama;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      setPesan(e instanceof Error ? e.message : 'Gagal membuat JPEG');
    } finally { setSibuk(false); }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button onClick={unduh} disabled={sibuk} className="kp-btn" style={{ display: 'inline-block' }}>
        {sibuk ? 'Menyiapkan…' : '⬇ Unduh JPEG (A4)'}
      </button>
      {pesan && <span style={{ color: '#c0392b', fontSize: 12 }}>{pesan}</span>}
    </span>
  );
}
