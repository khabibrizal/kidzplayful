// src/app/admin/TambahTemaForm.tsx — form tambah tema dengan UPLOAD GAMBAR sebagai ikon (sampul).
'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { buatTema } from '@/lib/data/admin-konten';
import { kompresGambar } from '@/lib/img';
import Sampul from '@/components/Sampul';
import s from './admin.module.css';

export default function TambahTemaForm() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [sampul, setSampul] = useState('');   // URL gambar (atau emoji fallback)
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function unggah(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg('File harus berupa gambar.'); return; }
    setUploading(true); setMsg('');
    try {
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 256, kualitas: 0.85 }); // ikon tema kecil
      const path = `tema/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
      if (error) throw error;
      setSampul(sb.storage.from('aset').getPublicUrl(path).data.publicUrl);
    } catch (e2) { setMsg(e2 instanceof Error ? e2.message : 'Gagal mengunggah gambar.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function buat() {
    if (!nama.trim()) { setMsg('Nama tema wajib diisi.'); return; }
    setLoading(true); setMsg('');
    try {
      await buatTema(nama, sampul); // sampul kosong → default 🎈 di server
      setNama(''); setSampul('');
      router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal membuat tema.'); }
    finally { setLoading(false); }
  }

  return (
    <div className={s.card}>
      <div className={s.row} style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width: 56, height: 56, borderRadius: 12, border: '2px dashed var(--lavender)', background: '#faf7ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, overflow: 'hidden' }}
          title="Unggah gambar ikon tema">
          {uploading ? '…' : sampul ? <Sampul value={sampul} size={52} /> : <span style={{ fontSize: 22, color: 'var(--lavender-d)' }}>🖼️</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={unggah} />
        <input className={s.inp} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama tema (mis. Kendaraan)" style={{ flex: 1, minWidth: 180, marginBottom: 0 }} />
        <button className={s.btn} type="button" onClick={buat} disabled={loading || uploading}>{loading ? '...' : '+ Buat'}</button>
      </div>
      <div className={s.muted} style={{ fontSize: 11, marginTop: 6 }}>Klik kotak untuk mengunggah gambar ikon dari perangkat. Bila dikosongkan, ikon default 🎈 dipakai.</div>
      {sampul && <button type="button" className={s.btnSm} style={{ background: '#eee', marginTop: 6 }} onClick={() => setSampul('')}>Hapus gambar</button>}
      {msg && <div className="kp-error" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
