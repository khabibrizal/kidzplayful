// src/app/admin/kelas-bermain/KelasAdmin.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buatKelas, updateKelas, toggleStatusKelas, hapusKelas, type KelasInput } from '@/lib/data/kelas-bermain-actions';
import type { KelasBermain } from '@/lib/game/tipe';
import s from '../admin.module.css';

const KOSONG: KelasInput = { judul: '', aktivitas: '', bahan: '', caraMembuat: '', langkah: [''], linkIde: '', worksheetUrl: null };

export default function KelasAdmin({ awal }: { awal: KelasBermain[] }) {
  const [list, setList] = useState<KelasBermain[]>(awal);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<KelasInput | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2200); }
  const tampil = list.filter((k) => k.judul.toLowerCase().includes(q.toLowerCase()));

  function bukaTambah() { setEditId(null); setForm({ ...KOSONG, langkah: [''] }); }
  function bukaEdit(k: KelasBermain) {
    setEditId(k.id);
    setForm({ judul: k.judul, aktivitas: k.aktivitas ?? '', bahan: k.bahan ?? '', caraMembuat: k.cara_membuat ?? '', langkah: k.langkah?.length ? k.langkah : [''], linkIde: k.link_ide ?? '', worksheetUrl: k.worksheet_url });
  }

  async function unggahPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !form) return;
    setLoading(true);
    try {
      const sb = createClient();
      const path = `worksheet/${Date.now()}-${Math.floor(performance.now())}.pdf`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      setForm({ ...form, worksheetUrl: sb.storage.from('aset').getPublicUrl(path).data.publicUrl });
      flash('Worksheet terunggah ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function simpan() {
    if (!form) return;
    if (!form.judul.trim()) { flash('Judul wajib diisi.'); return; }
    setLoading(true);
    try {
      if (editId) {
        const r = await updateKelas(editId, form);
        setList(list.map((k) => (k.id === editId ? r : k)));
        flash('Tersimpan ✓');
      } else {
        const r = await buatKelas(form);
        setList([r, ...list]);
        flash('Kelas bermain ditambahkan ✓');
      }
      setForm(null); setEditId(null);
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setLoading(false); }
  }

  async function toggle(k: KelasBermain) {
    setBusyId(k.id);
    const baru = k.status === 'aktif' ? 'nonaktif' : 'aktif';
    try { await toggleStatusKelas(k.id, baru); setList(list.map((x) => (x.id === k.id ? { ...x, status: baru } : x))); flash(baru === 'aktif' ? 'Diaktifkan ✓' : 'Dinonaktifkan ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }
  async function hapus(k: KelasBermain) {
    if (!confirm(`Hapus "${k.judul}"?`)) return;
    setBusyId(k.id);
    try { await hapusKelas(k.id); setList(list.filter((x) => x.id !== k.id)); flash('Dihapus ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className={s.row} style={{ gap: 8, marginBottom: 12 }}>
        <input className={s.inp} placeholder="Cari judul..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
        <button className={s.btn} onClick={bukaTambah}>+ Tambah Kelas Bermain</button>
      </div>

      {form && (
        <div className={s.card} style={{ border: '2px solid var(--lavender)' }}>
          <b>{editId ? 'Edit' : 'Tambah'} Kelas Bermain</b>
          <input className={s.inp} placeholder="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} style={{ width: '100%', marginTop: 8 }} />
          <textarea className={s.inp} placeholder="Aktivitas kelas bermain" rows={3} value={form.aktivitas} onChange={(e) => setForm({ ...form, aktivitas: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          <input className={s.inp} placeholder="Bahan" value={form.bahan} onChange={(e) => setForm({ ...form, bahan: e.target.value })} style={{ width: '100%' }} />
          <textarea className={s.inp} placeholder="Cara membuat" rows={3} value={form.caraMembuat} onChange={(e) => setForm({ ...form, caraMembuat: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          <div className={s.muted} style={{ margin: '4px 0' }}>Langkah aktivitas:</div>
          {form.langkah.map((l, i) => (
            <div key={i} className={s.row} style={{ marginTop: 4 }}>
              <span className={s.muted}>{i + 1}.</span>
              <input className={s.inp} value={l} placeholder="langkah..." onChange={(e) => setForm({ ...form, langkah: form.langkah.map((x, j) => (j === i ? e.target.value : x)) })} style={{ flex: 1, marginBottom: 0 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setForm({ ...form, langkah: [...form.langkah, ''] })}>+ langkah</button>
          <input className={s.inp} placeholder="Link/video referensi" value={form.linkIde} onChange={(e) => setForm({ ...form, linkIde: e.target.value })} style={{ width: '100%', marginTop: 10 }} />
          <div className={s.row} style={{ marginTop: 6 }}>
            <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => fileRef.current?.click()} disabled={loading}>{loading ? '...' : '⬆ Worksheet PDF'}</button>
            {form.worksheetUrl && <a className={s.muted} href={form.worksheetUrl} target="_blank" style={{ color: 'var(--biru-d)' }}>lihat PDF</a>}
            <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={unggahPdf} />
          </div>
          <div className={s.row} style={{ marginTop: 10 }}>
            <button className={s.btn} onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : '💾 Simpan'}</button>
            <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => { setForm(null); setEditId(null); }} disabled={loading}>Batal</button>
          </div>
        </div>
      )}

      <div className={s.section}>Daftar ({tampil.length})</div>
      {tampil.map((k) => (
        <div key={k.id} className={s.card} style={{ opacity: k.status === 'nonaktif' ? 0.55 : 1 }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{k.judul}</b> {k.status === 'nonaktif' && <span className={`${s.tag} ${s.tagDraf}`}>nonaktif</span>}</span>
          </div>
          <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(k)} disabled={busyId === k.id}>Edit</button>
            <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggle(k)} disabled={busyId === k.id}>{busyId === k.id ? '...' : (k.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan')}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(k)} disabled={busyId === k.id}>Hapus</button>
          </div>
        </div>
      ))}
      {tampil.length === 0 && <p className={s.muted}>Belum ada kelas bermain{q ? ' yang cocok' : ''}.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
