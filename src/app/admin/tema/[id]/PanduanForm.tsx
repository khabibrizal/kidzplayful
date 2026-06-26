// src/app/admin/tema/[id]/PanduanForm.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { simpanPanduan } from '@/lib/data/admin-konten';
import s from '../../admin.module.css';

export default function PanduanForm({
  temaId, awal,
}: { temaId: string; awal: { bahan: string | null; langkah: string[]; worksheet_url: string | null } | null }) {
  const [bahan, setBahan] = useState(awal?.bahan ?? '');
  const [langkah, setLangkah] = useState<string[]>(awal?.langkah?.length ? awal.langkah : ['']);
  const [worksheet, setWorksheet] = useState<string | null>(awal?.worksheet_url ?? null);
  const [naik, setNaik] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function unggahPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(''); setNaik(true);
    try {
      const supabase = createClient();
      const path = `worksheet/${Date.now()}-${Math.floor(performance.now())}.pdf`;
      const { error } = await supabase.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      setWorksheet(supabase.storage.from('aset').getPublicUrl(path).data.publicUrl);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setNaik(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function simpan() {
    setErr('');
    try { await simpanPanduan({ temaId, bahan, langkah, worksheetUrl: worksheet }); location.reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className={s.card}>
      <input className={s.inp} placeholder="Bahan (mis. wadah, kapas, kain bertekstur)" value={bahan} onChange={(e) => setBahan(e.target.value)} style={{ width: '100%' }} />
      <div className={s.muted} style={{ margin: '8px 0 4px' }}>Langkah aktivitas:</div>
      {langkah.map((l, i) => (
        <div key={i} className={s.row} style={{ marginTop: 4 }}>
          <span className={s.muted}>{i + 1}.</span>
          <input className={s.inp} value={l} placeholder="langkah..." onChange={(e) => setLangkah(langkah.map((x, j) => j === i ? e.target.value : x))} style={{ flex: 1 }} />
        </div>
      ))}
      <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setLangkah([...langkah, ''])}>+ langkah</button>

      <div className={s.row} style={{ marginTop: 10 }}>
        <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => fileRef.current?.click()} disabled={naik}>{naik ? '...' : '⬆ Worksheet PDF'}</button>
        {worksheet && <a href={worksheet} target="_blank" className={s.muted} style={{ color: 'var(--biru-d)' }}>lihat PDF</a>}
        <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={unggahPdf} />
      </div>
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{err}</div>}
      <button className={s.btn} style={{ marginTop: 10 }} onClick={simpan}>💾 Simpan panduan</button>
    </div>
  );
}
