// src/app/admin/psikolog/PsikologAdmin.tsx — kelola akses psikolog + MASTER PROFIL psikolog.
// Profil (nama, foto, pendidikan, STR, pengalaman) tampil di halaman konsultasi customer;
// jadwal & durasi sesi TIDAK diatur di sini — itu diisi psikolog sendiri di /psikolog/jadwal.
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { kompresGambar } from '@/lib/img';
import { jadikanPsikolog, cabutPsikolog, simpanProfilPsikolog } from '@/lib/data/admin-psikolog-actions';
import type { PsikologRow } from '@/lib/data/admin-psikolog';
import { setTarifKonsultasi } from '@/lib/data/admin-psikolog-actions';
import { formatRupiah } from '@/lib/format';
import type { ProfilPsikolog } from '@/lib/data/psikolog-profil';
import s from '../admin.module.css';

type Draf = {
  nama: string; badge: string; spesialisasi: string; fotoUrl: string;
  pendidikanS1: string; pendidikanProfesi: string; noStr: string; pengalaman: string;
  urutan: string; aktif: boolean;
};

function drafDari(p: PsikologRow, prof?: ProfilPsikolog): Draf {
  return {
    nama: prof?.nama || p.nama_tampilan || '',
    badge: prof?.badge ?? '',
    spesialisasi: prof?.spesialisasi ?? '',
    fotoUrl: prof?.foto_url ?? '',
    pendidikanS1: prof?.pendidikan_s1 ?? '',
    pendidikanProfesi: prof?.pendidikan_profesi ?? '',
    noStr: prof?.no_str ?? '',
    pengalaman: prof?.pengalaman ?? '',
    urutan: String(prof?.urutan ?? 0),
    aktif: prof?.aktif !== false,
  };
}

export default function PsikologAdmin({ awal, profil }: { awal: PsikologRow[]; profil: Record<string, ProfilPsikolog> }) {
  const [list, setList] = useState<PsikologRow[]>(awal);
  // Tarif diatur ADMIN di sini (permintaan pemilik: psikolog tidak mengisi tarifnya sendiri).
  const [tarif, setTarif] = useState<Record<string, string>>(() =>
    Object.fromEntries(awal.map((p) => [p.id, String(p.harga_konsultasi ?? 0)])));
  const [diskonM, setDiskonM] = useState<Record<string, string>>(() =>
    Object.fromEntries(awal.map((p) => [p.id, p.diskon_langganan_persen == null ? '' : String(p.diskon_langganan_persen)])));
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [buka, setBuka] = useState<string | null>(null);
  const [draf, setDraf] = useState<Record<string, Draf>>(() => {
    const d: Record<string, Draf> = {};
    for (const p of awal) d[p.id] = drafDari(p, profil[p.id]);
    return d;
  });
  const [unggah, setUnggah] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 3200); }
  const ubah = (id: string, k: keyof Draf, v: string | boolean) =>
    setDraf((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));

  async function tambah() {
    if (!email.trim()) { flash('Isi email psikolog.'); return; }
    setLoading(true);
    try { await jadikanPsikolog(email); flash('Psikolog diaktifkan ✓ (segarkan halaman untuk melihat daftar)'); setEmail(''); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }

  async function simpanTarif(p: PsikologRow) {
    setBusyId(p.id);
    const d = (diskonM[p.id] ?? '').trim();
    const r = await setTarifKonsultasi(p.id, Number(tarif[p.id]) || 0, d === '' ? null : Number(d) || 0);
    setBusyId(null);
    flash(r.ok ? 'Tarif konsultasi tersimpan ✓' : (r.error ?? 'Gagal'));
  }

  async function cabut(p: PsikologRow) {
    if (!confirm(`Cabut akses psikolog untuk ${p.email}?`)) return;
    setBusyId(p.id);
    try { await cabutPsikolog(p.id); setList(list.filter((x) => x.id !== p.id)); flash('Akses psikolog dicabut ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  async function pilihFoto(id: string, file?: File) {
    if (!file) return;
    setUnggah(id);
    try {
      const { blob, ext } = await kompresGambar(file, { maksDim: 640, kualitas: 0.82 });
      const sb = createClient();
      const path = `psikolog/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || file.type });
      if (error) throw error;
      ubah(id, 'fotoUrl', sb.storage.from('aset').getPublicUrl(path).data.publicUrl);
      flash('Foto terunggah ✓ — jangan lupa tekan Simpan');
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal unggah foto'); }
    finally { setUnggah(null); }
  }

  async function simpan(id: string) {
    const d = draf[id];
    setBusyId(id);
    const r = await simpanProfilPsikolog({
      psikologId: id, nama: d.nama, badge: d.badge, spesialisasi: d.spesialisasi, fotoUrl: d.fotoUrl,
      pendidikanS1: d.pendidikanS1, pendidikanProfesi: d.pendidikanProfesi, noStr: d.noStr,
      pengalaman: d.pengalaman, urutan: Number(d.urutan), aktif: d.aktif,
    });
    setBusyId(null);
    flash(r.ok ? 'Profil tersimpan ✓' : (r.error ?? 'Gagal menyimpan'));
  }

  return (
    <div>
      <div className={s.card}>
        <b>Aktifkan Psikolog</b>
        <div className={s.row} style={{ marginTop: 8, gap: 6 }}>
          <input className={s.inp} type="email" placeholder="email psikolog (yang sudah daftar)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
          <button className={s.btn} onClick={tambah} disabled={loading}>{loading ? '...' : '+ Jadikan Psikolog'}</button>
        </div>
        <p className={s.muted} style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          Jadwal buka & durasi sesi <b>tidak diatur di sini</b> — psikolog mengisinya sendiri di menu Jadwal miliknya.
        </p>
      </div>

      <div className={s.section}>Psikolog aktif ({list.length})</div>
      {list.length === 0 && <p className={s.muted}>Belum ada psikolog.</p>}

      {list.map((p) => {
        const d = draf[p.id] ?? drafDari(p, profil[p.id]);
        const terbuka = buka === p.id;
        return (
          <div key={p.id} className={s.card}>
            <div className={s.row} style={{ alignItems: 'center', gap: 10 }}>
              {d.fotoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={d.fotoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
                : <span style={{ width: 48, height: 48, borderRadius: 12, background: '#efe7fb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧠</span>}
              <span style={{ flex: 1 }}>
                <b>{d.nama || p.nama_tampilan || '(tanpa nama)'}</b>
                {!d.aktif && <span className={s.tag} style={{ marginLeft: 6, background: '#f3f0fb', color: '#b3261e' }}>disembunyikan</span>}
                <br /><small className={s.muted}>{p.email}</small>
                {!profil[p.id] && <><br /><small style={{ color: '#b26a00' }}>⚠ profil belum diisi — kartu di halaman konsultasi tampil seadanya</small></>}
              </span>
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => setBuka(terbuka ? null : p.id)}>
                {terbuka ? '▾ Tutup' : '✏️ Profil'}
              </button>
              <button className={`${s.btnSm} ${s.danger}`} onClick={() => cabut(p)} disabled={busyId === p.id}>Cabut</button>
            </div>

            {/* Tarif konsultasi — DIISI ADMIN. Psikolog hanya mengatur jadwal & durasinya. */}
            <div className={s.row} style={{ gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={s.muted} style={{ fontSize: 12, fontWeight: 700 }}>💳 Tarif / sesi</span>
              <input className={s.inp} type="number" min={0} value={tarif[p.id] ?? '0'}
                onChange={(e) => setTarif({ ...tarif, [p.id]: e.target.value })}
                style={{ width: 130, marginBottom: 0 }} placeholder="0 = bawaan" />
              <span className={s.muted} style={{ fontSize: 12 }}>diskon member</span>
              <input className={s.inp} type="number" min={0} max={100} value={diskonM[p.id] ?? ''}
                onChange={(e) => setDiskonM({ ...diskonM, [p.id]: e.target.value })}
                style={{ width: 100, marginBottom: 0 }} placeholder="% bawaan" />
              <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }}
                onClick={() => simpanTarif(p)} disabled={busyId === p.id}>
                {busyId === p.id ? '…' : 'Simpan tarif'}
              </button>
              <span className={s.muted} style={{ fontSize: 11 }}>
                {Number(tarif[p.id]) > 0 ? `= ${formatRupiah(Number(tarif[p.id]))}` : 'pakai tarif bawaan di menu Pembayaran'}
                {p.ada_jadwal === false && ' · psikolog belum membuka jadwal'}
              </span>
            </div>

            {terbuka && (
              <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 10 }}>
                <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
                  <input className={s.inp} placeholder="Nama + gelar (mis. Arina, M.Psi., Psikolog)" value={d.nama} onChange={(e) => ubah(p.id, 'nama', e.target.value)} style={{ flex: 2, minWidth: 220, marginBottom: 0 }} />
                  <input className={s.inp} placeholder="Badge (mis. Psikolog Anak)" value={d.badge} onChange={(e) => ubah(p.id, 'badge', e.target.value)} style={{ flex: 1, minWidth: 150, marginBottom: 0 }} />
                </div>
                <input className={s.inp} placeholder="Spesialisasi (mis. Psikolog Klinis Anak & Remaja)" value={d.spesialisasi} onChange={(e) => ubah(p.id, 'spesialisasi', e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                <input className={s.inp} placeholder="Pendidikan S1 (mis. S1 Psikologi – Universitas Indonesia)" value={d.pendidikanS1} onChange={(e) => ubah(p.id, 'pendidikanS1', e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                <input className={s.inp} placeholder="Pendidikan profesi (mis. M.Psi., Profesi Psikolog – UGM)" value={d.pendidikanProfesi} onChange={(e) => ubah(p.id, 'pendidikanProfesi', e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                <div className={s.row} style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <input className={s.inp} placeholder="No. STR Psikolog" value={d.noStr} onChange={(e) => ubah(p.id, 'noStr', e.target.value)} style={{ flex: 2, minWidth: 180, marginBottom: 0 }} />
                  <input className={s.inp} type="number" placeholder="Urutan" value={d.urutan} onChange={(e) => ubah(p.id, 'urutan', e.target.value)} style={{ width: 110, marginBottom: 0 }} />
                </div>
                <textarea className={s.inp} rows={3} placeholder="Pengalaman (mis. Berpengalaman dalam mendampingi tumbuh kembang anak, regulasi emosi, perilaku, dan pola asuh positif.)" value={d.pengalaman} onChange={(e) => ubah(p.id, 'pengalaman', e.target.value)} style={{ width: '100%', marginTop: 6, resize: 'vertical' }} />

                <div className={s.row} style={{ gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', cursor: 'pointer' }}>
                    {unggah === p.id ? 'Mengunggah…' : '⬆ Foto psikolog'}
                    <input type="file" accept="image/*" hidden onChange={(e) => pilihFoto(p.id, e.target.files?.[0])} />
                  </label>
                  {d.fotoUrl && <button type="button" className={s.btnSm} onClick={() => ubah(p.id, 'fotoUrl', '')} style={{ background: '#fdeaea', color: '#b3261e' }}>Hapus foto</button>}
                  <label style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={d.aktif} onChange={(e) => ubah(p.id, 'aktif', e.target.checked)} /> Tampilkan di halaman konsultasi
                  </label>
                  <span style={{ flex: 1 }} />
                  <button className={s.btn} onClick={() => simpan(p.id)} disabled={busyId === p.id}>{busyId === p.id ? 'Menyimpan…' : 'Simpan Profil'}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80, maxWidth: '90vw', textAlign: 'center' }}>{toast}</div>}
    </div>
  );
}
