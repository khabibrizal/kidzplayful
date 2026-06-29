// src/app/pesanan/[id]/BuktiUpload.tsx
'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadBuktiPesanan } from '@/lib/data/pesanan-actions';

export default function BuktiUpload({ pesananId }: { pesananId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function unggah(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true); setErr('');
    try {
      const sb = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `bukti/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      const url = sb.storage.from('aset').getPublicUrl(path).data.publicUrl;
      await uploadBuktiPesanan(pesananId, url);
      router.refresh();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  return (
    <div>
      <button type="button" className="kp-btn" onClick={() => fileRef.current?.click()} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Mengunggah…' : '⬆ Unggah bukti pembayaran'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={unggah} />
      {err && <div className="kp-error" style={{ marginTop: 8 }}>{err}</div>}
    </div>
  );
}
