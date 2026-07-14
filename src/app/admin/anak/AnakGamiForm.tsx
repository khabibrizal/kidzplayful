// src/app/admin/anak/AnakGamiForm.tsx — form gamifikasi per anak (admin)
'use client';
import { useState } from 'react';
import { setStreakKoin, toggleLencana } from '@/lib/data/admin-anak-actions';
import type { AnakAdmin } from '@/lib/data/admin-anak';
import type { LencanaDef } from '@/lib/domain/gamifikasi';
import s from '../admin.module.css';

function tglLahir(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function AnakGamiForm({ anak, lencanaSemua }: { anak: AnakAdmin; lencanaSemua: LencanaDef[] }) {
  const [streak, setStreak] = useState(String(anak.streak));
  const [koin, setKoin] = useState(String(anak.koin));
  const [dimiliki, setDimiliki] = useState<string[]>(anak.lencana);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2000); }

  async function simpan() {
    setBusy(true);
    try { await setStreakKoin(anak.id, Number(streak), Number(koin)); flash('Tersimpan ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  async function toggle(kode: string) {
    const beri = !dimiliki.includes(kode);
    setDimiliki((d) => (beri ? [...d, kode] : d.filter((k) => k !== kode))); // optimistik
    try { await toggleLencana(anak.id, kode, beri); }
    catch (e) { setDimiliki(anak.lencana); flash(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className={s.card}>
      <div className={s.row}>
        <span style={{ flex: 1 }}>
          <b>{anak.nama}</b>
          {anak.jenis_kelamin && <span className={s.muted}> · {anak.jenis_kelamin === 'laki-laki' ? '👦 Laki-laki' : anak.jenis_kelamin === 'perempuan' ? '👧 Perempuan' : anak.jenis_kelamin}</span>}
          <br /><span className={s.muted}>
            {anak.tanggal_lahir ? `🎂 ${tglLahir(anak.tanggal_lahir)}` : 'Tgl lahir —'}
            {' · '}👪 {anak.namaOrtu?.trim() || anak.email || '—'}
          </span>
        </span>
      </div>
      <div className={s.row} style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>🔥 Streak
          <input className={s.inp} value={streak} onChange={(e) => setStreak(e.target.value)} inputMode="numeric" style={{ width: 70, marginLeft: 6 }} />
        </label>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>🪙 Koin
          <input className={s.inp} value={koin} onChange={(e) => setKoin(e.target.value)} inputMode="numeric" style={{ width: 80, marginLeft: 6 }} />
        </label>
        <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }} onClick={simpan} disabled={busy}>Simpan</button>
        {msg && <span style={{ fontSize: 12, color: msg.includes('✓') ? '#2e9e63' : '#c0392b' }}>{msg}</span>}
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--abu)', marginBottom: 6 }}>LENCANA (klik untuk beri/cabut)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {lencanaSemua.map((l) => {
            const on = dimiliki.includes(l.kode);
            return (
              <button key={l.kode} type="button" onClick={() => toggle(l.kode)} title={l.syarat}
                style={{
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 700,
                  background: on ? '#efe7fb' : '#f3f3f8', color: on ? 'var(--lavender-d)' : 'var(--abu)',
                  opacity: on ? 1 : 0.6, boxShadow: on ? 'inset 0 0 0 1.5px #c9b6f0' : 'none',
                }}>
                <span style={{ filter: on ? 'none' : 'grayscale(1)' }}>{l.emoji}</span> {l.judul}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
