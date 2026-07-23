// src/components/admin/AsetInput.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isUrlAset } from '@/lib/game/aset';
import { kompresGambar } from '@/lib/img';

export default function AsetInput({
  value, onChange, placeholder, width = 130, tandaiKosong = false,
}: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number; tandaiKosong?: boolean }) {
  const kosong = tandaiKosong && !value.trim();
  const fileRef = useRef<HTMLInputElement>(null);
  const [naik, setNaik] = useState(false);
  const [err, setErr] = useState('');

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setNaik(true);
    try {
      const supabase = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 512, kualitas: 0.82 }); // kartu game kecil
      const path = `g/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await supabase.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from('aset').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal unggah');
    } finally {
      setNaik(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f8', borderRadius: 8, fontSize: 22, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? (isUrlAset(value) ? <img src={value} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} /> : value) : '·'}
      </span>
      <input value={isUrlAset(value) ? '' : value} placeholder={placeholder ?? '🐱 / teks'}
        onChange={(e) => onChange(e.target.value)}
        style={{ width, background: kosong ? '#fde8e6' : '#f3f3f8', border: kosong ? '2px solid #e57373' : 'none', borderRadius: 8, padding: kosong ? 6 : 8, fontFamily: 'inherit' }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={naik}
        style={{ border: 'none', cursor: 'pointer', background: '#efe7fb', color: '#9B7FD4', borderRadius: 8, padding: '7px 9px', fontWeight: 700, fontSize: 12 }}>
        {naik ? '...' : '⬆ gambar'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pilihFile} />
      {err && <span style={{ color: '#c0392b', fontSize: 11 }}>{err}</span>}
    </span>
  );
}
