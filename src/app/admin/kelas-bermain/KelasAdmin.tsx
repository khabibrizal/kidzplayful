// src/app/admin/kelas-bermain/KelasAdmin.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buatKelas, updateKelas, toggleStatusKelas, hapusKelas, setBolehTrialKelas, type KelasInput } from '@/lib/data/kelas-bermain-actions';
import type { KelasBermain } from '@/lib/game/tipe';
import s from '../admin.module.css';

const AREA_FOKUS = [
  { key: 'motorik-halus', label: '✋ Motorik Halus' },
  { key: 'motorik-kasar', label: '🏃 Motorik Kasar' },
  { key: 'kognitif', label: '🧠 Kognitif' },
  { key: 'bahasa', label: '🗣️ Bahasa' },
  { key: 'sosial-emosional', label: '💞 Sosial-Emosional' },
  { key: 'sensorik', label: '🖐️ Sensorik' },
  { key: 'kemandirian', label: '🌟 Kemandirian' },
  { key: 'kreativitas', label: '🎨 Kreativitas' },
];

const KOSONG: KelasInput = {
  judul: '',
  tujuan: '',
  fokusArea: [],
  peranOrtu: '',
  usiaMin: 0,
  usiaMax: 6,
  bahan: [{ nama: '', link: '', produkId: '' }],
  aktivitas: [{ judul: '', caraMembuat: '', langkah: [''], catatanOrtu: '' }],
  linkIde: '',
  worksheetUrl: null,
};

export default function KelasAdmin({ awal, produkOpsi = [] }: { awal: KelasBermain[]; produkOpsi?: { id: string; nama: string }[] }) {
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

  function bukaTambah() { setEditId(null); setForm(structuredClone(KOSONG)); }
  function bukaEdit(k: KelasBermain) {
    setEditId(k.id);
    setForm({
      judul: k.judul,
      tujuan: k.tujuan ?? '',
      fokusArea: k.fokus_area ?? [],
      peranOrtu: k.peran_ortu ?? '',
      usiaMin: k.usia_min ?? 0,
      usiaMax: k.usia_max ?? 6,
      bahan: k.bahan?.length ? k.bahan.map((b) => ({ nama: b.nama, link: b.link ?? '', produkId: b.produk_id ?? '' })) : [{ nama: '', link: '', produkId: '' }],
      aktivitas: k.aktivitas?.length
        ? k.aktivitas.map((a) => ({ judul: a.judul, caraMembuat: a.cara_membuat ?? '', langkah: a.langkah?.length ? a.langkah : [''], catatanOrtu: a.catatan_ortu ?? '' }))
        : [{ judul: '', caraMembuat: '', langkah: [''], catatanOrtu: '' }],
      linkIde: k.link_ide ?? '',
      worksheetUrl: k.worksheet_url,
    });
  }

  // --- helper update nested state ---
  function setBahan(i: number, patch: Partial<{ nama: string; link: string; produkId: string }>) {
    if (!form) return;
    setForm({ ...form, bahan: form.bahan.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  }
  function tambahBahan() { if (form) setForm({ ...form, bahan: [...form.bahan, { nama: '', link: '', produkId: '' }] }); }
  function hapusBahan(i: number) { if (form) setForm({ ...form, bahan: form.bahan.filter((_, j) => j !== i) }); }

  function setAkt(ai: number, patch: Partial<{ judul: string; caraMembuat: string; catatanOrtu: string }>) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, ...patch } : a)) });
  }
  function tambahAktivitas() { if (form) setForm({ ...form, aktivitas: [...form.aktivitas, { judul: '', caraMembuat: '', langkah: [''], catatanOrtu: '' }] }); }
  function hapusAktivitas(ai: number) { if (form) setForm({ ...form, aktivitas: form.aktivitas.filter((_, j) => j !== ai) }); }
  function setLangkah(ai: number, li: number, val: string) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, langkah: a.langkah.map((x, k) => (k === li ? val : x)) } : a)) });
  }
  function tambahLangkah(ai: number) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, langkah: [...a.langkah, ''] } : a)) });
  }
  function hapusLangkah(ai: number, li: number) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, langkah: a.langkah.filter((_, k) => k !== li) } : a)) });
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
  async function toggleTrial(k: KelasBermain) {
    setBusyId(k.id);
    const baru = k.boleh_trial === false; // toggle
    try { await setBolehTrialKelas(k.id, baru); setList(list.map((x) => (x.id === k.id ? { ...x, boleh_trial: baru } : x))); flash(baru ? 'Boleh diakses trial ✓' : 'Terkunci untuk trial 🔒'); }
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

          <input className={s.inp} placeholder="Judul kelas" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} style={{ width: '100%', marginTop: 8 }} />

          {/* TUJUAN + USIA */}
          <textarea className={s.inp} placeholder="🎯 Tujuan kelas bermain ini (mis. melatih motorik halus & mengenal warna) — tampil ke orang tua" rows={2} value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          <div className={s.row} style={{ gap: 6, alignItems: 'center' }}>
            <span className={s.muted} style={{ fontSize: 12 }}>👶 Untuk usia:</span>
            <input className={s.inp} type="number" min={0} max={12} value={form.usiaMin} onChange={(e) => setForm({ ...form, usiaMin: Number(e.target.value) })} style={{ width: 64, marginBottom: 0 }} />
            <span className={s.muted}>–</span>
            <input className={s.inp} type="number" min={0} max={12} value={form.usiaMax} onChange={(e) => setForm({ ...form, usiaMax: Number(e.target.value) })} style={{ width: 64, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 11 }}>tahun</span>
          </div>

          {/* FOKUS AREA + PERAN ORTU */}
          <div className={s.muted} style={{ margin: '10px 0 4px', fontSize: 12 }}>🧩 Fokus area perkembangan (bisa pilih lebih dari satu):</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {AREA_FOKUS.map((ar) => {
              const on = form.fokusArea.includes(ar.key);
              return (
                <button key={ar.key} type="button"
                  onClick={() => setForm({ ...form, fokusArea: on ? form.fokusArea.filter((x) => x !== ar.key) : [...form.fokusArea, ar.key] })}
                  style={{ border: 'none', cursor: 'pointer', borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 700, background: on ? 'var(--lavender-d)' : '#f1eef8', color: on ? '#fff' : 'var(--abu)' }}>
                  {ar.label}
                </button>
              );
            })}
          </div>
          <textarea className={s.inp} placeholder="🤝 Peran orang tua dalam kelas bermain ini (mis. mendampingi, membacakan instruksi, memuji usaha anak) — tampil ke orang tua" rows={2} value={form.peranOrtu} onChange={(e) => setForm({ ...form, peranOrtu: e.target.value })} style={{ width: '100%', resize: 'vertical', marginTop: 8 }} />

          {/* BAHAN (nama + link toko opsional) */}
          <div className={s.muted} style={{ margin: '8px 0 4px' }}>🧺 Bahan (boleh hubungkan ke produk Store, atau pakai link toko luar):</div>
          {form.bahan.map((b, i) => (
            <div key={i} style={{ marginTop: 6, padding: 8, background: '#faf7ff', borderRadius: 10 }}>
              <div className={s.row} style={{ gap: 6 }}>
                <input className={s.inp} placeholder="Nama bahan" value={b.nama} onChange={(e) => setBahan(i, { nama: e.target.value })} style={{ flex: 1, marginBottom: 0 }} />
                <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => hapusBahan(i)} title="Hapus bahan">✕</button>
              </div>
              <select className={s.inp} value={b.produkId} onChange={(e) => setBahan(i, { produkId: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                <option value="">— Beli di Store: tidak dihubungkan —</option>
                {produkOpsi.map((p) => <option key={p.id} value={p.id}>🛒 {p.nama}</option>)}
              </select>
              {!b.produkId && (
                <input className={s.inp} placeholder="atau Link toko luar (opsional)" value={b.link} onChange={(e) => setBahan(i, { link: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
              )}
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={tambahBahan}>+ tambah bahan</button>

          {/* AKTIVITAS (grup: judul + cara membuat + langkah masing-masing) */}
          <div className={s.muted} style={{ margin: '12px 0 4px' }}>Aktivitas:</div>
          {form.aktivitas.map((a, ai) => (
            <div key={ai} className={s.card} style={{ background: '#faf7ff', marginTop: 6 }}>
              <div className={s.row}>
                <b style={{ flex: 1 }}>Aktivitas {ai + 1}</b>
                <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapusAktivitas(ai)} title="Hapus aktivitas">✕</button>
              </div>
              <input className={s.inp} placeholder="Judul aktivitas" value={a.judul} onChange={(e) => setAkt(ai, { judul: e.target.value })} style={{ width: '100%', marginTop: 6 }} />
              <textarea className={s.inp} placeholder="Cara membuat" rows={2} value={a.caraMembuat} onChange={(e) => setAkt(ai, { caraMembuat: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
              <div className={s.muted} style={{ margin: '4px 0' }}>Langkah:</div>
              {a.langkah.map((l, li) => (
                <div key={li} className={s.row} style={{ marginTop: 4 }}>
                  <span className={s.muted}>{li + 1}.</span>
                  <input className={s.inp} value={l} placeholder="langkah..." onChange={(e) => setLangkah(ai, li, e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
                  <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => hapusLangkah(ai, li)} title="Hapus langkah">✕</button>
                </div>
              ))}
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => tambahLangkah(ai)}>+ langkah</button>
              <textarea className={s.inp} placeholder="💡 Catatan untuk orang tua (mis. dampingi anak saat menggunting) — tampil di halaman user" rows={2} value={a.catatanOrtu} onChange={(e) => setAkt(ai, { catatanOrtu: e.target.value })} style={{ width: '100%', resize: 'vertical', marginTop: 8 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43', marginTop: 8 }} onClick={tambahAktivitas}>+ tambah aktivitas</button>

          <input className={s.inp} placeholder="Link YouTube / referensi (link YouTube tampil sbg video embed)" value={form.linkIde} onChange={(e) => setForm({ ...form, linkIde: e.target.value })} style={{ width: '100%', marginTop: 12 }} />
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
            <span style={{ flex: 1 }}><b>{k.judul}</b> {k.status === 'nonaktif' && <span className={`${s.tag} ${s.tagDraf}`}>nonaktif</span>}
              {k.boleh_trial === false && <span className={`${s.tag} ${s.tagDraf}`} style={{ marginLeft: 4 }}>🔒 non-trial</span>}
              <br /><small className={s.muted}>{k.aktivitas?.length ?? 0} aktivitas · {k.bahan?.length ?? 0} bahan · 👶 {k.usia_min ?? 0}–{k.usia_max ?? 6} th</small>
              {k.tujuan && <><br /><small className={s.muted}>🎯 {k.tujuan}</small></>}
            </span>
          </div>
          <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(k)} disabled={busyId === k.id}>Edit</button>
            <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggle(k)} disabled={busyId === k.id}>{busyId === k.id ? '...' : (k.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan')}</button>
            <button className={s.btnSm} style={{ background: k.boleh_trial === false ? '#eee' : '#dff5e6', color: k.boleh_trial === false ? '#888' : '#1c7a43' }} onClick={() => toggleTrial(k)} disabled={busyId === k.id} title="Boleh diakses user trial?">{k.boleh_trial === false ? 'Trial ✗' : 'Trial ✓'}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(k)} disabled={busyId === k.id}>Hapus</button>
          </div>
        </div>
      ))}
      {tampil.length === 0 && <p className={s.muted}>Belum ada kelas bermain{q ? ' yang cocok' : ''}.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
