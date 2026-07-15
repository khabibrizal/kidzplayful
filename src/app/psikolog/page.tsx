// src/app/psikolog/page.tsx — beranda psikolog: pendaftaran menunggu + sesi aktif + jadwal
import Link from 'next/link';
import { getPsikologTerjamin, getSesiPsikolog, getJadwalSaya } from '@/lib/data/psikolog';
import { formatTanggal } from '@/lib/format';
import LogoutBtn from '../admin/LogoutBtn';
import SesiActions from './SesiActions';

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default async function PsikologHome() {
  const psi = await getPsikologTerjamin();
  const [{ menunggu, aktif }, jadwal] = await Promise.all([getSesiPsikolog(psi.id), getJadwalSaya(psi.id)]);

  return (
    <main style={{ maxWidth: 520, margin: '24px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: 0 }}>🧠 Area Psikolog</h1>
        <LogoutBtn />
      </div>
      <p style={{ color: 'var(--abu)', fontSize: 14, margin: '8px 0 16px' }}>Hai, {psi.nama || 'Psikolog'}. Kelola konsultasi & jadwal di sini.</p>

      <Link href="/psikolog/jadwal" className="kp-card" style={{ display: 'block', marginBottom: 16, textDecoration: 'none', color: 'inherit' }}>
        <b>🗓️ Jadwal & Kuota Konsultasi</b>
        <br />
        {jadwal
          ? <small style={{ color: 'var(--abu)' }}>{jadwal.aktif ? 'Aktif' : 'Nonaktif'} · {jadwal.hari_buka.length ? jadwal.hari_buka.slice().sort().map((h) => HARI[h]).join(', ') : 'belum pilih hari'} · maks {jadwal.maks_per_hari}/hari</small>
          : <small style={{ color: '#c0392b' }}>Belum diatur — atur dulu agar customer bisa daftar.</small>}
      </Link>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>MENUNGGU PERSETUJUAN ({menunggu.length})</div>
      {menunggu.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Tidak ada pendaftaran baru.</p>}
      {menunggu.map((p) => (
        <div key={p.id} className="kp-card" style={{ marginBottom: 8 }}>
          <div><b>{p.anak_nama || 'Anak'}</b> · <small style={{ color: 'var(--abu)' }}>{formatTanggal(p.tanggal)}</small></div>
          {p.keluhan && <p style={{ fontSize: 13, margin: '6px 0', color: 'var(--tinta)' }}>“{p.keluhan}”</p>}
          <div style={{ marginTop: 8 }}><SesiActions id={p.id} mode="menunggu" /></div>
        </div>
      ))}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>SESI AKTIF ({aktif.length})</div>
      {aktif.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada sesi aktif.</p>}
      {aktif.map((p) => (
        <div key={p.id} className="kp-card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span><b>{p.anak_nama || 'Anak'}</b> · <small style={{ color: 'var(--abu)' }}>{formatTanggal(p.tanggal)}</small></span>
            <Link href={`/psikolog/${p.id}`} className="kp-btn" style={{ padding: '6px 14px', fontSize: 13 }}>💬 Buka chat</Link>
          </div>
        </div>
      ))}
    </main>
  );
}
