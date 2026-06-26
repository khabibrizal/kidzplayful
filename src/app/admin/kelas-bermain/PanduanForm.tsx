// src/app/admin/kelas-bermain/PanduanForm.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { simpanPanduan } from '@/lib/data/admin-konten';
import s from '../admin.module.css';

export default function PanduanForm({
  temaId, awal,
}: { temaId: string; awal: { judul: string | null; aktivitas: string | null; bahan: string | null; cara_membuat: string | null; langkah: string[]; link_ide: string | null; worksheet_url: string | null } | null }) {
  const [judul, setJudul] = useState(awal?.judul ?? '');
  const [aktivitas, setAktivitas] = useState(awal?.aktivitas ?? '');
  const [bahan, setBahan] = useState(awal?.bahan ?? '');
  const [caraMembuat, setCaraMembuat] = useState(awal?.cara_membuat ?? '');
  const [langkah, setLangkah] = useState<string[]>(awal?.langkah?.length ? awal.langkah : ['']);
  const [linkIde, setLinkIde] = useState(awal?.link_ide ?? '');
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
    try { await simpanPanduan({ temaId, judul, aktivitas, bahan, caraMembuat, langkah, linkIde, worksheetUrl: worksheet }); location.reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className={s.card}>
      <input className={s.inp} placeholder="Judul (mis. Bermain Tekstur)" value={judul} onChange={(e) => setJudul(e.target.value)} style={{ width: '100%' }} />
      <textarea className={s.inp} placeholder="Aktivitas kelas bermain (apa yang dilakukan minggu ini)" value={aktivitas} onChange={(e) => setAktivitas(e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical', marginTop: 8 }} />
      <input className={s.inp} placeholder="Bahan (mis. wadah, kapas, kain bertekstur)" value={bahan} onChange={(e) => setBahan(e.target.value)} style={{ width: '100%', marginTop: 8 }} />
      <textarea className={s.inp} placeholder="Cara membuat (penjelasan bebas)" value={caraMembuat} onChange={(e) => setCaraMembuat(e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical', marginTop: 8 }} />
      <div className={s.muted} style={{ margin: '8px 0 4px' }}>Langkah aktivitas:</div>
      {langkah.map((l, i) => (
        <div key={i} className={s.row} style={{ marginTop: 4 }}>
          <span className={s.muted}>{i + 1}.</span>
          <input className={s.inp} value={l} placeholder="langkah..." onChange={(e) => setLangkah(langkah.map((x, j) => j === i ? e.target.value : x))} style={{ flex: 1 }} />
        </div>
      ))}
      <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setLangkah([...langkah, ''])}>+ langkah</button>

      <input className={s.inp} placeholder="Link/video referensi (mis. https://...)" value={linkIde} onChange={(e) => setLinkIde(e.target.value)} style={{ width: '100%', marginTop: 10 }} />
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
