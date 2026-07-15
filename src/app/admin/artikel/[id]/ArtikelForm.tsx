// src/app/admin/artikel/[id]/ArtikelForm.tsx — form editor artikel (admin)
'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { simpanArtikel, hapusArtikel } from '@/lib/data/artikel-admin';
import { slugify } from '@/lib/slug';
import type { Artikel } from '@/lib/data/artikel';
import s from '../../admin.module.css';
import TombolKembali from '@/components/TombolKembali';

export default function ArtikelForm({ artikel }: { artikel: Artikel }) {
  const router = useRouter();
  const [judul, setJudul] = useState(artikel.judul);
  const [slug, setSlug] = useState(artikel.slug);
  const [ringkasan, setRingkasan] = useState(artikel.ringkasan);
  const [isi, setIsi] = useState(artikel.isi);
  const [sampul, setSampul] = useState(artikel.sampul_url ?? '');
  const [status, setStatus] = useState<'draf' | 'terbit'>(artikel.status);
  const [loading, setLoading] = useState(false);
  const [naik, setNaik] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function unggah(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNaik(true); setMsg('');
    try {
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `artikel/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await supabase.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      setSampul(supabase.storage.from('aset').getPublicUrl(path).data.publicUrl);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal unggah'); }
    finally { setNaik(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function simpan(statusBaru?: 'draf' | 'terbit') {
    const st = statusBaru ?? status;
    setLoading(true); setMsg('');
    try {
      await simpanArtikel({ id: artikel.id, judul, slug, ringkasan, isi, sampulUrl: sampul, status: st });
      setStatus(st);
      setMsg(st === 'terbit' ? 'Terbit ✓' : 'Tersimpan ✓');
      router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }

  async function hapus() {
    if (!confirm('Hapus artikel ini?')) return;
    setLoading(true);
    try { await hapusArtikel(artikel.id); router.push('/admin/artikel'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); setLoading(false); }
  }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}>
        <h1>📝 Edit Artikel</h1>
        <span className={`${s.tag} ${status === 'terbit' ? s.tagOk : s.tagDraf}`}>{status}</span>
      </div>

      <div className={s.card}>
        <label className={s.section} style={{ marginTop: 0 }}>Judul</label>
        <input className={s.inp} value={judul} onChange={(e) => setJudul(e.target.value)} style={{ width: '100%' }} />

        <label className={s.section}>Slug URL (huruf kecil, tanpa spasi)</label>
        <div className={s.row}>
          <input className={s.inp} value={slug} onChange={(e) => setSlug(e.target.value)} style={{ flex: 1 }} />
          <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => setSlug(slugify(judul))}>Dari judul</button>
        </div>
        <div className={s.muted} style={{ marginTop: 4 }}>URL: /artikel/{slug || '...'}</div>

        <label className={s.section}>Ringkasan (untuk kartu & meta description SEO)</label>
        <textarea className={s.inp} value={ringkasan} onChange={(e) => setRingkasan(e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} placeholder="1–2 kalimat ringkas." />

        <label className={s.section}>Gambar sampul</label>
        <div className={s.row}>
          <input className={s.inp} value={sampul} onChange={(e) => setSampul(e.target.value)} style={{ flex: 1 }} placeholder="URL gambar / unggah →" />
          <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => fileRef.current?.click()} disabled={naik}>{naik ? '...' : '⬆ Unggah'}</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={unggah} />
        </div>
        {sampul && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sampul} alt="sampul" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, marginTop: 8 }} />
        )}

        <label className={s.section}>Isi artikel</label>
        <div className={s.muted} style={{ marginBottom: 6 }}>Format: <code>## Judul bagian</code>, <code>### Sub</code>, <code>- daftar</code>, <code>**tebal**</code>, <code>[teks](https://…)</code>. Baris kosong = paragraf baru.</div>
        <textarea className={s.inp} value={isi} onChange={(e) => setIsi(e.target.value)} rows={16} style={{ width: '100%', resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: 13, lineHeight: 1.6 }} />

        {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', margin: '8px 0' }}>{msg}</div>}

        <div className={s.row} style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <button className={s.btn} onClick={() => simpan()} disabled={loading}>💾 Simpan</button>
          {status !== 'terbit'
            ? <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }} onClick={() => simpan('terbit')} disabled={loading}>🚀 Terbitkan</button>
            : <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => simpan('draf')} disabled={loading}>Jadikan Draf</button>}
          {status === 'terbit' && <Link href={`/artikel/${slug}`} target="_blank" className={s.btnSm} style={{ background: '#e6f7ee', color: '#2e9e63' }}>Lihat ↗</Link>}
          <TombolKembali fallback="/admin/artikel" className={s.btnSm} style={{ background: '#f0ecf9', color: 'var(--tinta)' }} />
          <button className={`${s.btnSm} ${s.danger}`} onClick={hapus} disabled={loading} style={{ marginLeft: 'auto' }}>Hapus</button>
        </div>
      </div>
    </div>
  );
}
