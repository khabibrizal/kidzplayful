// src/components/UploadNota.tsx — unggah foto nota/bukti, dikompres ke WebP di klien (hemat server)
// Merender <input hidden name={name}> agar URL ikut ter-submit di <form action> server.
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import BuktiLightbox from './BuktiLightbox';

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Gambar tidak valid'));
    img.src = URL.createObjectURL(file);
  });
}

async function kompresWebp(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const maxW = 1280;
  const scale = Math.min(1, maxW / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Gagal kompres'))), 'image/webp', 0.8));
}

export default function UploadNota({ name, label = '⬆ Upload foto nota', awal = '' }: { name: string; label?: string; awal?: string }) {
  const [url, setUrl] = useState(awal);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const webp = await kompresWebp(file);
      const s = createClient();
      const path = `nota/${Date.now()}-${Math.floor(performance.now())}.webp`;
      const { error } = await s.storage.from('aset').upload(path, webp, { upsert: false, contentType: 'image/webp' });
      if (error) throw error;
      setUrl(s.storage.from('aset').getPublicUrl(path).data.publicUrl);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <input type="hidden" name={name} value={url} />
      {url && <BuktiLightbox url={url} variant="thumb" judul="Nota" />}
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, padding: '7px 12px', borderRadius: 999, background: '#efe7fb', color: 'var(--lavender-d)' }}>
        {busy ? 'Mengompres…' : (url ? '✓ Ganti nota' : label)}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pilih} />
      {err && <span style={{ color: '#c0392b', fontSize: 11 }}>{err}</span>}
    </span>
  );
}
