// src/app/konsultasi/BookingForm.tsx — customer daftar konsultasi (tanggal & jam dibatasi jadwal psikolog)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { daftarKonsultasi } from '@/lib/data/konsultasi-actions';
import { formatTanggal } from '@/lib/format';
import type { JadwalPsikolog } from '@/lib/game/tipe';

const HARI_S = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const toMin = (t?: string | null) => { const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : NaN; };
const toHHMM = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
function buatSlot(mulai?: string | null, selesai?: string | null, durasi?: number): string[] {
  const a = toMin(mulai), b = toMin(selesai);
  if (isNaN(a) || isNaN(b) || !durasi || durasi <= 0) return [];
  const out: string[] = [];
  for (let t = a; t + durasi <= b; t += durasi) out.push(toHHMM(t));
  return out;
}
/** Daftar tanggal (30 hari ke depan, WIB) yang jatuh pada hari buka psikolog. */
function tanggalTersedia(hariBuka: number[]): string[] {
  if (!hariBuka?.length) return [];
  const out: string[] = [];
  const base = Date.now() + 7 * 3600 * 1000; // WIB
  for (let i = 0; i < 30; i++) {
    const d = new Date(base + i * 86400000);
    if (hariBuka.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function BookingForm({ psikolog, anak }: { psikolog: JadwalPsikolog[]; anak: { id: string; nama: string }[] }) {
  const router = useRouter();
  const [psikologId, setPsikologId] = useState('');
  const [anakId, setAnakId] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  const dipilih = psikolog.find((p) => p.psikolog_id === psikologId);
  const dates = dipilih ? tanggalTersedia(dipilih.hari_buka) : [];
  const slots = dipilih ? buatSlot(dipilih.jam_mulai, dipilih.jam_selesai, dipilih.durasi_menit) : [];
  const adaWindow = !!(dipilih && dipilih.jam_mulai && dipilih.jam_selesai);

  function gantiPsikolog(id: string) { setPsikologId(id); setTanggal(''); setJam(''); setMsg(''); }

  async function submit() {
    if (!psikologId || !anakId || !tanggal) { setOk(false); setMsg('Lengkapi psikolog, anak, dan tanggal.'); return; }
    if (adaWindow && !jam) { setOk(false); setMsg('Pilih jam konsultasi dulu.'); return; }
    setBusy(true); setMsg(''); setOk(false);
    const r = await daftarKonsultasi({ psikologId, anakId, tanggal, jam, keluhan });
    setBusy(false);
    if (r.ok) { setOk(true); setMsg('Pendaftaran terkirim ✓ Menunggu persetujuan psikolog.'); setTanggal(''); setJam(''); setKeluhan(''); router.refresh(); }
    else { setOk(false); setMsg(r.error ?? 'Gagal mendaftar.'); }
  }

  if (psikolog.length === 0) return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada psikolog yang membuka jadwal konsultasi. Silakan cek lagi nanti.</p>;
  if (anak.length === 0) return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Tambahkan data anak dulu di Beranda sebelum mendaftar konsultasi.</p>;

  return (
    <div className="kp-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select className="kp-input" value={psikologId} onChange={(e) => gantiPsikolog(e.target.value)} style={{ marginBottom: 0 }}>
        <option value="">— Pilih psikolog —</option>
        {psikolog.map((p) => <option key={p.psikolog_id} value={p.psikolog_id}>{p.nama || 'Psikolog'}</option>)}
      </select>

      {dipilih && (
        <div style={{ fontSize: 12, color: 'var(--abu)', background: '#f7f5fc', borderRadius: 8, padding: '6px 10px' }}>
          Buka: {dipilih.hari_buka.length ? dipilih.hari_buka.slice().sort().map((h) => HARI_S[h]).join(', ') : '—'}
          {dipilih.jam_mulai && ` · ${dipilih.jam_mulai}–${dipilih.jam_selesai} WIB`}
          {dipilih.durasi_menit > 0 && ` · ${dipilih.durasi_menit} mnt/sesi`}
          {dipilih.catatan && <><br />{dipilih.catatan}</>}
        </div>
      )}

      <select className="kp-input" value={anakId} onChange={(e) => setAnakId(e.target.value)} style={{ marginBottom: 0 }}>
        <option value="">— Pilih anak —</option>
        {anak.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
      </select>

      {dipilih && (
        dates.length === 0
          ? <span style={{ fontSize: 12, color: '#c0392b' }}>Psikolog belum mengatur hari buka.</span>
          : (
            <select className="kp-input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="">— Pilih tanggal (hari buka) —</option>
              {dates.map((d) => <option key={d} value={d}>{formatTanggal(d)}</option>)}
            </select>
          )
      )}

      {dipilih && adaWindow && (
        slots.length > 0
          ? (
            <select className="kp-input" value={jam} onChange={(e) => setJam(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="">— Pilih jam —</option>
              {slots.map((sl) => <option key={sl} value={sl}>{sl} - {toHHMM(toMin(sl) + (dipilih.durasi_menit || 0))} WIB</option>)}
            </select>
          )
          : (
            <label style={{ fontSize: 12, color: 'var(--abu)' }}>Jam ({dipilih.jam_mulai}–{dipilih.jam_selesai})
              <input className="kp-input" type="time" min={dipilih.jam_mulai ?? undefined} max={dipilih.jam_selesai ?? undefined} value={jam} onChange={(e) => setJam(e.target.value)} style={{ marginBottom: 0, display: 'block' }} />
            </label>
          )
      )}

      <textarea className="kp-input" placeholder="Keluhan / hal yang ingin dikonsultasikan (opsional)" rows={3} value={keluhan} onChange={(e) => setKeluhan(e.target.value)} style={{ resize: 'vertical', marginBottom: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="kp-btn mint" onClick={submit} disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Mengirim…' : '📅 Daftar Konsultasi'}</button>
        {msg && <span style={{ fontSize: 13, fontWeight: 700, color: ok ? '#1c7a43' : '#c0392b' }}>{msg}</span>}
      </div>
    </div>
  );
}
