// src/app/konsultasi/BookingForm.tsx — customer daftar konsultasi (pilih psikolog, anak, tanggal)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { daftarKonsultasi } from '@/lib/data/konsultasi-actions';
import type { JadwalPsikolog } from '@/lib/game/tipe';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_S = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function BookingForm({ psikolog, anak }: { psikolog: JadwalPsikolog[]; anak: { id: string; nama: string }[] }) {
  const router = useRouter();
  const [psikologId, setPsikologId] = useState('');
  const [anakId, setAnakId] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  const dipilih = psikolog.find((p) => p.psikolog_id === psikologId);
  const minTgl = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // WIB hari ini
  const hariTanggal = tanggal ? new Date(tanggal + 'T00:00:00Z').getUTCDay() : null;
  const hariCocok = dipilih && hariTanggal !== null ? dipilih.hari_buka.includes(hariTanggal) : true;

  async function submit() {
    if (!psikologId || !anakId || !tanggal) { setOk(false); setMsg('Lengkapi psikolog, anak, dan tanggal.'); return; }
    setBusy(true); setMsg(''); setOk(false);
    const r = await daftarKonsultasi({ psikologId, anakId, tanggal, keluhan });
    setBusy(false);
    if (r.ok) { setOk(true); setMsg('Pendaftaran terkirim ✓ Menunggu persetujuan psikolog.'); setTanggal(''); setKeluhan(''); router.refresh(); }
    else { setOk(false); setMsg(r.error ?? 'Gagal mendaftar.'); }
  }

  if (psikolog.length === 0) {
    return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada psikolog yang membuka jadwal konsultasi. Silakan cek lagi nanti.</p>;
  }
  if (anak.length === 0) {
    return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Tambahkan data anak dulu di Beranda sebelum mendaftar konsultasi.</p>;
  }

  return (
    <div className="kp-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select className="kp-input" value={psikologId} onChange={(e) => setPsikologId(e.target.value)} style={{ marginBottom: 0 }}>
        <option value="">— Pilih psikolog —</option>
        {psikolog.map((p) => <option key={p.psikolog_id} value={p.psikolog_id}>{p.nama || 'Psikolog'}</option>)}
      </select>

      {dipilih && (
        <div style={{ fontSize: 12, color: 'var(--abu)', background: '#f7f5fc', borderRadius: 8, padding: '6px 10px' }}>
          Buka: {dipilih.hari_buka.length ? dipilih.hari_buka.slice().sort().map((h) => HARI_S[h]).join(', ') : '—'}
          {dipilih.jam_mulai && ` · ${dipilih.jam_mulai}–${dipilih.jam_selesai} WIB`}
          {dipilih.catatan && <><br />{dipilih.catatan}</>}
        </div>
      )}

      <select className="kp-input" value={anakId} onChange={(e) => setAnakId(e.target.value)} style={{ marginBottom: 0 }}>
        <option value="">— Pilih anak —</option>
        {anak.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
      </select>

      <input className="kp-input" type="date" min={minTgl} value={tanggal} onChange={(e) => setTanggal(e.target.value)} style={{ marginBottom: 0 }} />
      {!hariCocok && dipilih && <span style={{ fontSize: 12, color: '#c0392b' }}>Psikolog tidak buka pada hari {hariTanggal !== null ? HARI[hariTanggal] : ''}.</span>}

      <textarea className="kp-input" placeholder="Keluhan / hal yang ingin dikonsultasikan (opsional)" rows={3} value={keluhan} onChange={(e) => setKeluhan(e.target.value)} style={{ resize: 'vertical', marginBottom: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="kp-btn mint" onClick={submit} disabled={busy || !hariCocok} style={{ alignSelf: 'flex-start' }}>{busy ? 'Mengirim…' : '📅 Daftar Konsultasi'}</button>
        {msg && <span style={{ fontSize: 13, fontWeight: 700, color: ok ? '#1c7a43' : '#c0392b' }}>{msg}</span>}
      </div>
    </div>
  );
}
