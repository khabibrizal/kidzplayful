// src/app/admin/produk/ProdukAdmin.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { kompresGambar } from '@/lib/img';
import { buatProduk, updateProduk, hapusProduk, type ProdukInput } from '@/lib/data/admin-store-actions';
import type { Produk } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import s from '../admin.module.css';

const KOSONG: ProdukInput = { nama: '', deskripsi: '', kategori: '', harga: 0, diskonTrialPersen: 0, diskonLanggananPersen: 0, beratGram: 0, stok: 0, gambarUrl: null, status: 'tampil' };
const KATEGORI = ['Mainan', 'Bahan Sensorik', 'Worksheet', 'Buku', 'Alat Tulis'];

export default function ProdukAdmin({ awal }: { awal: Produk[] }) {
  const [list, setList] = useState<Produk[]>(awal);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<ProdukInput | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [katLain, setKatLain] = useState(false); // kategori "Lainnya" (kustom)
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2200); }
  const tampil = list.filter((p) => p.nama.toLowerCase().includes(q.toLowerCase()));

  function bukaTambah() { setEditId(null); setForm({ ...KOSONG }); setKatLain(false); }
  function bukaEdit(p: Produk) {
    setEditId(p.id);
    setForm({ nama: p.nama, deskripsi: p.deskripsi ?? '', kategori: p.kategori ?? '', harga: p.harga, diskonTrialPersen: p.diskon_trial_persen ?? 0, diskonLanggananPersen: p.diskon_langganan_persen ?? 0, beratGram: p.berat_gram ?? 0, stok: p.stok, gambarUrl: p.gambar_url, status: p.status });
    setKatLain(!!p.kategori && !KATEGORI.includes(p.kategori));
  }

  async function unggahGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !form) return;
    setLoading(true);
    try {
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.82 });
      const path = `produk/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
      if (error) throw error;
      setForm({ ...form, gambarUrl: sb.storage.from('aset').getPublicUrl(path).data.publicUrl });
      flash('Gambar terunggah ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function simpan() {
    if (!form) return;
    if (!form.nama.trim()) { flash('Nama produk wajib diisi.'); return; }
    setLoading(true);
    try {
      if (editId) { const r = await updateProduk(editId, form); setList(list.map((x) => (x.id === editId ? r : x))); flash('Tersimpan ✓'); }
      else { const r = await buatProduk(form); setList([r, ...list]); flash('Produk ditambahkan ✓'); }
      setForm(null); setEditId(null);
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }

  async function toggleStatus(p: Produk) {
    setBusyId(p.id);
    const baru = p.status === 'tampil' ? 'arsip' : 'tampil';
    try { const r = await updateProduk(p.id, { nama: p.nama, deskripsi: p.deskripsi ?? '', kategori: p.kategori ?? '', harga: p.harga, diskonTrialPersen: p.diskon_trial_persen ?? 0, diskonLanggananPersen: p.diskon_langganan_persen ?? 0, beratGram: p.berat_gram ?? 0, stok: p.stok, gambarUrl: p.gambar_url, status: baru }); setList(list.map((x) => (x.id === p.id ? r : x))); flash(baru === 'tampil' ? 'Ditampilkan ✓' : 'Diarsipkan ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }
  async function hapus(p: Produk) {
    if (!confirm(`Hapus produk "${p.nama}"?`)) return;
    setBusyId(p.id);
    try { await hapusProduk(p.id); setList(list.filter((x) => x.id !== p.id)); flash('Dihapus ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className={s.row} style={{ gap: 8, marginBottom: 12 }}>
        <input className={s.inp} placeholder="Cari produk..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
        <button className={s.btn} onClick={bukaTambah}>+ Tambah Produk</button>
      </div>

      {form && (
        <div className={s.card} style={{ border: '2px solid var(--lavender)' }}>
          <b>{editId ? 'Edit' : 'Tambah'} Produk</b>
          <input className={s.inp} placeholder="Nama produk" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} style={{ width: '100%', marginTop: 8 }} />
          <select
            className={s.inp}
            value={katLain ? 'Lainnya' : form.kategori}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'Lainnya') { setKatLain(true); setForm({ ...form, kategori: '' }); }
              else { setKatLain(false); setForm({ ...form, kategori: v }); }
            }}
            style={{ width: '100%' }}
          >
            <option value="">— Pilih kategori —</option>
            {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
            <option value="Lainnya">Lainnya…</option>
          </select>
          {katLain && (
            <input className={s.inp} placeholder="Tulis kategori baru" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} style={{ width: '100%' }} />
          )}
          <div className={s.row} style={{ gap: 6 }}>
            <input className={s.inp} type="number" min={0} placeholder="Harga normal (Rp)" value={form.harga || ''} onChange={(e) => setForm({ ...form, harga: Number(e.target.value) })} style={{ flex: 1, marginBottom: 0 }} />
            <input className={s.inp} type="number" min={0} placeholder="Stok" value={form.stok || ''} onChange={(e) => setForm({ ...form, stok: Number(e.target.value) })} style={{ width: 80, marginBottom: 0 }} />
          </div>
          <div className={s.row} style={{ gap: 6, marginTop: 6 }}>
            <input className={s.inp} type="number" min={0} max={100} placeholder="Diskon Trial (%)" value={form.diskonTrialPersen || ''} onChange={(e) => setForm({ ...form, diskonTrialPersen: Number(e.target.value) })} style={{ flex: 1, marginBottom: 0 }} />
            <input className={s.inp} type="number" min={0} max={100} placeholder="Diskon Langganan (%)" value={form.diskonLanggananPersen || ''} onChange={(e) => setForm({ ...form, diskonLanggananPersen: Number(e.target.value) })} style={{ flex: 1, marginBottom: 0 }} />
          </div>
          <div className={s.muted} style={{ fontSize: 11, marginTop: 4 }}>Isi persen (0–100). Kosongkan/0 = tanpa diskon.</div>
          <input className={s.inp} type="number" min={0} placeholder="Berat (gram)" value={form.beratGram || ''} onChange={(e) => setForm({ ...form, beratGram: Number(e.target.value) })} style={{ width: '100%', marginTop: 6 }} />
          <textarea className={s.inp} placeholder="Keterangan produk" rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} style={{ width: '100%', resize: 'vertical', marginTop: 6 }} />
          <div className={s.row} style={{ marginTop: 6 }}>
            <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => fileRef.current?.click()} disabled={loading}>{loading ? '...' : '⬆ Gambar Produk'}</button>
            {form.gambarUrl && <a className={s.muted} href={form.gambarUrl} target="_blank" style={{ color: 'var(--biru-d)' }}>lihat gambar</a>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={unggahGambar} />
          </div>
          <div className={s.row} style={{ marginTop: 10 }}>
            <button className={s.btn} onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : '💾 Simpan'}</button>
            <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => { setForm(null); setEditId(null); }} disabled={loading}>Batal</button>
          </div>
        </div>
      )}

      <div className={s.section}>Produk ({tampil.length})</div>
      {tampil.map((p) => (
        <div key={p.id} className={s.card} style={{ opacity: p.status === 'arsip' ? 0.55 : 1 }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{p.nama}</b> {p.status === 'arsip' && <span className={`${s.tag} ${s.tagDraf}`}>arsip</span>}
              <br /><small className={s.muted}>{formatRupiah(p.harga)} · stok {p.stok}{p.kategori ? ` · ${p.kategori}` : ''}</small>
            </span>
          </div>
          <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(p)} disabled={busyId === p.id}>Edit</button>
            <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggleStatus(p)} disabled={busyId === p.id}>{busyId === p.id ? '...' : (p.status === 'tampil' ? 'Arsipkan' : 'Tampilkan')}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(p)} disabled={busyId === p.id}>Hapus</button>
          </div>
        </div>
      ))}
      {tampil.length === 0 && <p className={s.muted}>Belum ada produk.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
