// src/app/admin/event/EventAdmin.tsx
'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { buatEvent, updateEvent, toggleStatusEvent, hapusEvent, type EventInput } from '@/lib/data/admin-event-actions';
import type { EventKelas } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import s from '../admin.module.css';

const KOSONG: EventInput = { judul: '', lokasi: '', tanggal: '', jamMulai: '', jamSelesai: '', deskripsi: '', gambarUrl: null, hargaPerAnak: 0 };

export default function EventAdmin({ awal, counts }: { awal: EventKelas[]; counts: Record<string, number> }) {
  const [list, setList] = useState<EventKelas[]>(awal);
  const [form, setForm] = useState<EventInput | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2200); }
  function bukaTambah() { setEditId(null); setForm({ ...KOSONG }); }
  function bukaEdit(e: EventKelas) {
    setEditId(e.id);
    setForm({
      judul: e.judul, lokasi: e.lokasi ?? '', tanggal: e.tanggal ?? '',
      jamMulai: e.jam_mulai ?? '', jamSelesai: e.jam_selesai ?? '',
      deskripsi: e.deskripsi ?? '', gambarUrl: e.gambar_url, hargaPerAnak: e.harga_per_anak,
    });
  }

  async function unggahGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !form) return;
    setLoading(true);
    try {
      const sb = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `event/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      setForm({ ...form, gambarUrl: sb.storage.from('aset').getPublicUrl(path).data.publicUrl });
      flash('Gambar terunggah ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function simpan() {
    if (!form) return;
    if (!form.judul.trim()) { flash('Judul wajib diisi.'); return; }
    setLoading(true);
    try {
      if (editId) {
        const r = await updateEvent(editId, form);
        setList(list.map((x) => (x.id === editId ? r : x)));
        flash('Tersimpan ✓');
      } else {
        const r = await buatEvent(form);
        setList([r, ...list]);
        flash('Event ditambahkan ✓');
      }
      setForm(null); setEditId(null);
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setLoading(false); }
  }

  async function toggle(e: EventKelas) {
    setBusyId(e.id);
    const baru = e.status === 'tampil' ? 'arsip' : 'tampil';
    try { await toggleStatusEvent(e.id, baru); setList(list.map((x) => (x.id === e.id ? { ...x, status: baru } : x))); flash(baru === 'tampil' ? 'Ditampilkan ✓' : 'Diarsipkan ✓'); }
    catch (er) { flash(er instanceof Error ? er.message : 'Gagal'); }
    finally { setBusyId(null); }
  }
  async function hapus(e: EventKelas) {
    if (!confirm(`Hapus event "${e.judul}"? Semua pendaftaran ikut terhapus.`)) return;
    setBusyId(e.id);
    try { await hapusEvent(e.id); setList(list.filter((x) => x.id !== e.id)); flash('Dihapus ✓'); }
    catch (er) { flash(er instanceof Error ? er.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className={s.row} style={{ marginBottom: 12 }}>
        <button className={s.btn} onClick={bukaTambah}>+ Tambah Event</button>
      </div>

      {form && (
        <div className={s.card} style={{ border: '2px solid var(--lavender)' }}>
          <b>{editId ? 'Edit' : 'Tambah'} Event Kelas Bermain</b>
          <input className={s.inp} placeholder="Judul event" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} style={{ width: '100%', marginTop: 8 }} />
          <input className={s.inp} placeholder="Lokasi event" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} style={{ width: '100%' }} />
          <div className={s.row} style={{ gap: 6 }}>
            <input className={s.inp} type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} style={{ flex: 1, marginBottom: 0 }} />
          </div>
          <div className={s.row} style={{ gap: 6, marginTop: 6 }}>
            <input className={s.inp} placeholder="Jam mulai (09.00)" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} style={{ flex: 1, marginBottom: 0 }} />
            <input className={s.inp} placeholder="Jam selesai (11.00)" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} style={{ flex: 1, marginBottom: 0 }} />
          </div>
          <input className={s.inp} type="number" min={0} placeholder="Harga per anak (Rp)" value={form.hargaPerAnak || ''} onChange={(e) => setForm({ ...form, hargaPerAnak: Number(e.target.value) })} style={{ width: '100%', marginTop: 6 }} />
          <textarea className={s.inp} placeholder="Deskripsi event" rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          <div className={s.row} style={{ marginTop: 6 }}>
            <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => fileRef.current?.click()} disabled={loading}>{loading ? '...' : '⬆ Gambar Event'}</button>
            {form.gambarUrl && <a className={s.muted} href={form.gambarUrl} target="_blank" style={{ color: 'var(--biru-d)' }}>lihat gambar</a>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={unggahGambar} />
          </div>
          <div className={s.row} style={{ marginTop: 10 }}>
            <button className={s.btn} onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : '💾 Simpan'}</button>
            <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => { setForm(null); setEditId(null); }} disabled={loading}>Batal</button>
          </div>
        </div>
      )}

      <div className={s.section}>Event ({list.length})</div>
      {list.map((e) => (
        <div key={e.id} className={s.card} style={{ opacity: e.status === 'arsip' ? 0.55 : 1 }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{e.judul}</b> {e.status === 'arsip' && <span className={`${s.tag} ${s.tagDraf}`}>arsip</span>}
              <br /><small className={s.muted}>{e.tanggal ?? '-'} · {formatRupiah(e.harga_per_anak)}/anak</small>
            </span>
          </div>
          <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <Link href={`/admin/event/${e.id}/pendaftar`} className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }}>👥 Pendaftar ({counts[e.id] ?? 0})</Link>
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(e)} disabled={busyId === e.id}>Edit</button>
            <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggle(e)} disabled={busyId === e.id}>{busyId === e.id ? '...' : (e.status === 'tampil' ? 'Arsipkan' : 'Tampilkan')}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(e)} disabled={busyId === e.id}>Hapus</button>
          </div>
        </div>
      ))}
      {list.length === 0 && <p className={s.muted}>Belum ada event.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
