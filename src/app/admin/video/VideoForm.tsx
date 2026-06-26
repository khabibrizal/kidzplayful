// src/app/admin/video/VideoForm.tsx
'use client';
import { useState } from 'react';
import { buatVideo } from '@/lib/data/admin-konten';
import s from '../admin.module.css';

export default function VideoForm() {
  const [judul, setJudul] = useState('');
  const [link, setLink] = useState('');
  const [menit, setMenit] = useState('2');
  const [kategori, setKategori] = useState<'baby' | 'toddler'>('toddler');
  const [err, setErr] = useState('');

  async function simpan() {
    setErr('');
    try {
      await buatVideo({ judul, youtubeId: link, kategori, durasiDetik: (Number(menit) || 0) * 60 });
      location.reload();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className={s.card}>
      <div className={s.row}>
        <input className={s.inp} placeholder="Judul video" value={judul} onChange={(e) => setJudul(e.target.value)} style={{ flex: 1 }} />
        <select className={s.inp} value={kategori} onChange={(e) => setKategori(e.target.value as 'baby' | 'toddler')}>
          <option value="baby">Baby (0-2)</option>
          <option value="toddler">Toddler (2+)</option>
        </select>
        <input className={s.inp} placeholder="menit" value={menit} onChange={(e) => setMenit(e.target.value)} style={{ width: 70 }} />
      </div>
      <div className={s.row} style={{ marginTop: 6 }}>
        <input className={s.inp} placeholder="Link/ID YouTube" value={link} onChange={(e) => setLink(e.target.value)} style={{ flex: 1 }} />
        <button className={s.btn} onClick={simpan}>+ Video</button>
      </div>
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}
