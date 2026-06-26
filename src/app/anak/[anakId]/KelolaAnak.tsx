// src/app/anak/[anakId]/KelolaAnak.tsx
'use client';
import { useState } from 'react';
import { updateAnak, setBatas, hapusAnak } from '@/lib/data/ortu-actions';

export default function KelolaAnak({ anak }: { anak: { id: string; nama: string; tanggal_lahir: string; batas_menit: number } }) {
  const [nama, setNama] = useState(anak.nama);
  const [tgl, setTgl] = useState(anak.tanggal_lahir);
  const [batas, setBatasState] = useState(anak.batas_menit);
  const [msg, setMsg] = useState('');

  async function simpan() {
    setMsg('');
    try { await updateAnak(anak.id, nama, tgl); await setBatas(anak.id, batas); setMsg('Tersimpan ✓'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
  }
  async function hapus() {
    if (!confirm(`Hapus profil ${anak.nama}? Data progres ikut terhapus.`)) return;
    try { await hapusAnak(anak.id); } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className="kp-card">
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Nama</label>
      <input className="kp-input" value={nama} onChange={(e) => setNama(e.target.value)} />
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Tanggal lahir</label>
      <input className="kp-input" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Batas waktu main / hari</label>
      <select className="kp-input" value={batas} onChange={(e) => setBatasState(Number(e.target.value))}>
        <option value={15}>15 menit</option><option value={20}>20 menit</option>
        <option value={30}>30 menit</option><option value={45}>45 menit</option>
      </select>
      {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={simpan}>Simpan</button>
      <button onClick={hapus} style={{ width: '100%', marginTop: 8, background: '#fde8e8', color: '#d35050', border: 'none', borderRadius: 999, padding: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Hapus profil anak</button>
    </div>
  );
}
