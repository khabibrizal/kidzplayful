// src/components/UnduhSertifikatBtn.tsx — unduh e-sertifikat sebagai JPEG A4 landscape.
// Dirender di canvas (bukan lewat dialog cetak) supaya ukuran berkasnya PASTI A4 landscape,
// tidak bergantung setelan skala/margin/header-footer di dialog cetak pengguna.
'use client';
import { useState } from 'react';
import { buatSertifikatJpeg, type IsiSertifikat } from '@/lib/sertifikat-jpeg';

export default function UnduhSertifikatBtn({ isi }: { isi: IsiSertifikat }) {
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');

  async function unduh() {
    if (sibuk) return;
    setSibuk(true); setPesan('');
    try {
      const blob = await buatSertifikatJpeg(isi);
      const nama = `sertifikat-${(isi.anakNama || 'anak').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nama;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      // Penyebab paling mungkin: template sertifikat gagal dimuat (CORS/404).
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
