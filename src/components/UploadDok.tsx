// src/components/UploadDok.tsx — unggah dokumen (PDF/gambar) ke Storage lalu simpan URL via server action
'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { simpanDokumen } from '@/lib/data/sponsor-actions';

export default function UploadDok({ dealId, field, label, urlAda }: {
  dealId: string; field: 'quotation_url' | 'agreement_url' | 'bukti_url'; label: string; urlAda?: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [naik, setNaik] = useState(false);
  const [err, setErr] = useState('');

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setNaik(true);
    try {
      const sb = createClient();
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const path = `dok-sponsor/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) throw error;
      const url = sb.storage.from('aset').getPublicUrl(path).data.publicUrl;
      await simpanDokumen(dealId, field, url);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal unggah');
    } finally {
      setNaik(false);
      if (ref.current) ref.current.value = '';
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => ref.current?.click()} disabled={naik}
        style={{ border: 'none', cursor: 'pointer', background: '#efe7fb', color: 'var(--lavender-d)', borderRadius: 8, padding: '7px 12px', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
        {naik ? '...' : `⬆ ${label}`}
      </button>
      {urlAda && <a href={urlAda} target="_blank" rel="noopener" style={{ color: 'var(--biru-d)', fontSize: 12 }}>📎 lihat</a>}
      <input ref={ref} type="file" accept="application/pdf,image/*" hidden onChange={pilih} />
      {err && <span style={{ color: '#c0392b', fontSize: 11 }}>{err}</span>}
    </span>
  );
}
