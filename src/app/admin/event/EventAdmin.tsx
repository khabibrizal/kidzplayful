// src/app/admin/event/EventAdmin.tsx
'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { kompresGambar } from '@/lib/img';
import { buatEvent, updateEvent, toggleStatusEvent, hapusEvent, simpanBerkasSertifikat, type EventInput } from '@/lib/data/admin-event-actions';
import { generateSertifikatEvent } from '@/lib/data/admin-sertifikat-actions';
import DownloadPesertaBtn from './DownloadPesertaBtn';
import type { EventKelas } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import s from '../admin.module.css';

const KOSONG: EventInput = { judul: '', lokasi: '', tanggal: '', jamMulai: '', jamSelesai: '', deskripsi: '', gambarUrl: null, hargaPerAnak: 0, hargaPendamping: 0, diskonLanggananPersen: 0, babyTanggal: '', babyJamMulai: '', babyJamSelesai: '', toddlerTanggal: '', toddlerJamMulai: '', toddlerJamSelesai: '' };

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
      deskripsi: e.deskripsi ?? '', gambarUrl: e.gambar_url, hargaPerAnak: e.harga_per_anak, hargaPendamping: e.harga_pendamping ?? 0, diskonLanggananPersen: e.diskon_langganan_persen ?? 0,
      babyTanggal: e.baby_tanggal ?? '', babyJamMulai: e.baby_jam_mulai ?? '', babyJamSelesai: e.baby_jam_selesai ?? '',
      toddlerTanggal: e.toddler_tanggal ?? '', toddlerJamMulai: e.toddler_jam_mulai ?? '', toddlerJamSelesai: e.toddler_jam_selesai ?? '',
    });
  }

  async function unggahGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !form) return;
    setLoading(true);
    try {
      const sb = createClient();
      const komp = await kompresGambar(file, { maksDim: 1280, kualitas: 0.82 });
      const path = `event/${Date.now()}-${Math.floor(performance.now())}.${komp.ext}`;
      const { error } = await sb.storage.from('aset').upload(path, komp.blob, { upsert: false, contentType: komp.blob.type || undefined });
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
          <div className={s.muted} style={{ fontSize: 12, marginTop: 10, fontWeight: 700, color: 'var(--lavender-d)' }}>Kelas terpisah (opsional)</div>
          <div className={s.muted} style={{ fontSize: 11, marginBottom: 4 }}>Isi jam per kelas bila event dibagi Baby & Toddler. Kosongkan semua = event gabungan (pakai tgl/jam utama di atas). Tanggal kelas kosong = ikut tanggal utama.</div>
          <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>👶 Baby Class</div>
            <div className={s.row} style={{ gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <input className={s.inp} type="date" value={form.babyTanggal} onChange={(e) => setForm({ ...form, babyTanggal: e.target.value })} style={{ flex: 1, minWidth: 130, marginBottom: 0 }} />
              <input className={s.inp} placeholder="Jam mulai" value={form.babyJamMulai} onChange={(e) => setForm({ ...form, babyJamMulai: e.target.value })} style={{ flex: 1, minWidth: 90, marginBottom: 0 }} />
              <input className={s.inp} placeholder="Jam selesai" value={form.babyJamSelesai} onChange={(e) => setForm({ ...form, babyJamSelesai: e.target.value })} style={{ flex: 1, minWidth: 90, marginBottom: 0 }} />
            </div>
          </div>
          <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 8, marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>🧒 Toddler Class</div>
            <div className={s.row} style={{ gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <input className={s.inp} type="date" value={form.toddlerTanggal} onChange={(e) => setForm({ ...form, toddlerTanggal: e.target.value })} style={{ flex: 1, minWidth: 130, marginBottom: 0 }} />
              <input className={s.inp} placeholder="Jam mulai" value={form.toddlerJamMulai} onChange={(e) => setForm({ ...form, toddlerJamMulai: e.target.value })} style={{ flex: 1, minWidth: 90, marginBottom: 0 }} />
              <input className={s.inp} placeholder="Jam selesai" value={form.toddlerJamSelesai} onChange={(e) => setForm({ ...form, toddlerJamSelesai: e.target.value })} style={{ flex: 1, minWidth: 90, marginBottom: 0 }} />
            </div>
          </div>
          <input className={s.inp} type="number" min={0} placeholder="Harga per anak (Rp)" value={form.hargaPerAnak || ''} onChange={(e) => setForm({ ...form, hargaPerAnak: Number(e.target.value) })} style={{ width: '100%', marginTop: 6 }} />
          <input className={s.inp} type="number" min={0} placeholder="Harga tambah pendamping (Rp) — opsional" value={form.hargaPendamping || ''} onChange={(e) => setForm({ ...form, hargaPendamping: Number(e.target.value) })} style={{ width: '100%', marginTop: 6 }} />
          <div className={s.muted} style={{ fontSize: 11, marginTop: 2 }}>Biaya per 1 pendamping. Kosongkan/0 = tanpa opsi pendamping.</div>
          <input className={s.inp} type="number" min={0} max={100} placeholder="Diskon Berlangganan (%) — opsional" value={form.diskonLanggananPersen || ''} onChange={(e) => setForm({ ...form, diskonLanggananPersen: Number(e.target.value) })} style={{ width: '100%', marginTop: 6 }} />
          <div className={s.muted} style={{ fontSize: 11, marginTop: 2 }}>Diskon event (persen) hanya untuk pelanggan aktif. Kosongkan/0 = tanpa diskon.</div>
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
            <DownloadPesertaBtn eventId={e.id} judul={e.judul} />
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(e)} disabled={busyId === e.id}>Edit</button>
            <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggle(e)} disabled={busyId === e.id}>{busyId === e.id ? '...' : (e.status === 'tampil' ? 'Arsipkan' : 'Tampilkan')}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(e)} disabled={busyId === e.id}>Hapus</button>
          </div>

          <details style={{ marginTop: 8, borderTop: '1px dashed #e6e0f2', paddingTop: 8 }}>
            <summary style={{ fontSize: 13, fontWeight: 700, color: 'var(--lavender-d)' }}>🏅 Sertifikat & Dokumentasi</summary>
            <PanelSertifikat e={e} flash={flash} onSaved={(patch) => setList((l) => l.map((x) => (x.id === e.id ? { ...x, ...patch } : x)))} />
          </details>
        </div>
      ))}
      {list.length === 0 && <p className={s.muted}>Belum ada event.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}

/** Panel per-kartu: upload template sertifikat (JPEG) + link dokumentasi → auto-generate e-sertifikat untuk anak HADIR. */
function PanelSertifikat({ e, flash, onSaved }: {
  e: EventKelas;
  flash: (m: string) => void;
  onSaved: (patch: Partial<EventKelas>) => void;
}) {
  const [bg, setBg] = useState<string | null>(e.sertifikat_bg_url);
  const [doc, setDoc] = useState(e.dokumentasi_url ?? '');
  const [stiker, setStiker] = useState<string | null>(e.stiker_bg_url);
  const [busy, setBusy] = useState(false);
  const tplRef = useRef<HTMLInputElement>(null);
  const stikerRef = useRef<HTMLInputElement>(null);

  async function generate() {
    const n = await generateSertifikatEvent(e.id);
    flash(n > 0 ? `E-sertifikat digenerate untuk ${n} anak hadir ✓` : 'Belum ada anak berstatus hadir.');
  }

  async function unggahTemplate(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]; if (!file) return;
    setBusy(true);
    try {
      const sb = createClient();
      const komp = await kompresGambar(file, { maksDim: 2000, kualitas: 0.9 }); // ringan — jaga kualitas cetak
      const path = `event/sertifikat-${Date.now()}-${Math.floor(performance.now())}.${komp.ext}`;
      const { error } = await sb.storage.from('aset').upload(path, komp.blob, { upsert: false, contentType: komp.blob.type || undefined });
      if (error) throw error;
      const url = sb.storage.from('aset').getPublicUrl(path).data.publicUrl;
      await simpanBerkasSertifikat(e.id, { sertifikatBgUrl: url });
      setBg(url); onSaved({ sertifikat_bg_url: url });
      await generate();
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah template'); }
    finally { setBusy(false); if (tplRef.current) tplRef.current.value = ''; }
  }

  async function simpanDoc() {
    setBusy(true);
    try {
      await simpanBerkasSertifikat(e.id, { dokumentasiUrl: doc });
      onSaved({ dokumentasi_url: doc.trim() || null });
      await generate();
      flash('Link dokumentasi tersimpan ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal simpan link'); }
    finally { setBusy(false); }
  }

  async function unggahStiker(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]; if (!file) return;
    setBusy(true);
    try {
      const sb = createClient();
      const komp = await kompresGambar(file, { maksDim: 2000, kualitas: 0.9 }); // ringan — jaga kualitas cetak
      const path = `event/stiker-${Date.now()}-${Math.floor(performance.now())}.${komp.ext}`;
      const { error } = await sb.storage.from('aset').upload(path, komp.blob, { upsert: false, contentType: komp.blob.type || undefined });
      if (error) throw error;
      const url = sb.storage.from('aset').getPublicUrl(path).data.publicUrl;
      await simpanBerkasSertifikat(e.id, { stikerBgUrl: url });
      setStiker(url); onSaved({ stiker_bg_url: url });
      flash('Template stiker tersimpan ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah stiker'); }
    finally { setBusy(false); if (stikerRef.current) stikerRef.current.value = ''; }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div className={s.muted} style={{ fontSize: 12, marginBottom: 6 }}>
        Tandai anak <b>Hadir</b> dulu di halaman Pendaftar. Upload template (JPEG landscape, sisakan ruang tengah untuk nama anak) → e-sertifikat otomatis dibuat untuk anak hadir.
      </div>
      <div className={s.row} style={{ flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => tplRef.current?.click()} disabled={busy}>{busy ? '...' : '⬆ Template Sertifikat (JPEG)'}</button>
        {bg && <a className={s.muted} href={bg} target="_blank" style={{ color: 'var(--biru-d)' }}>lihat template</a>}
        <input ref={tplRef} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden onChange={unggahTemplate} />
      </div>
      <div className={s.row} style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
        <input className={s.inp} placeholder="Link dokumentasi (mis. album foto)" value={doc} onChange={(ev) => setDoc(ev.target.value)} style={{ flex: 1, minWidth: 180, marginBottom: 0 }} />
        <button type="button" className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} onClick={simpanDoc} disabled={busy}>Simpan link</button>
      </div>
      <div className={s.row} style={{ marginTop: 8 }}>
        <button type="button" className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={async () => { setBusy(true); try { await generate(); } finally { setBusy(false); } }} disabled={busy}>🔄 Generate ulang sertifikat</button>
      </div>

      <div style={{ marginTop: 10, borderTop: '1px dashed #e6e0f2', paddingTop: 8 }}>
        <div className={s.muted} style={{ fontSize: 12, marginBottom: 6 }}>🏷️ Stiker nama (9×6 cm, 10/lembar F4) untuk <b>semua anak yang daftar</b>. Upload template (opsional, sisakan ruang untuk nama), lalu cetak.</div>
        <div className={s.row} style={{ flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => stikerRef.current?.click()} disabled={busy}>{busy ? '...' : '⬆ Template Stiker'}</button>
          {stiker && <a className={s.muted} href={stiker} target="_blank" style={{ color: 'var(--biru-d)' }}>lihat</a>}
          <input ref={stikerRef} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden onChange={unggahStiker} />
          <Link href={`/stiker-event/${e.id}`} className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} target="_blank">🏷️ Cetak Stiker Nama</Link>
        </div>
      </div>
    </div>
  );
}
