// src/app/anak/[anakId]/KelolaAnak.tsx
'use client';
import { useState } from 'react';
import { updateAnak, setBatas, hapusAnak } from '@/lib/data/ortu-actions';

export default function KelolaAnak({ anak }: { anak: { id: string; nama: string; nama_panggilan?: string | null; tanggal_lahir: string; batas_menit: number; jenis_kelamin: string | null } }) {
  const [nama, setNama] = useState(anak.nama);
  const [namaPanggilan, setNamaPanggilan] = useState(anak.nama_panggilan ?? '');
  const [tgl, setTgl] = useState(anak.tanggal_lahir);
  const [jk, setJk] = useState(anak.jenis_kelamin ?? '');
  const [batas, setBatasState] = useState(anak.batas_menit);
  const [msg, setMsg] = useState('');
  const maksTgl = new Date(Date.now() + 7 * 3600 * 1000 - 86400000).toISOString().slice(0, 10); // maksimal kemarin (WIB)

  async function simpan() {
    setMsg('');
    try { await updateAnak(anak.id, nama, tgl, jk, namaPanggilan); await setBatas(anak.id, batas); setMsg('Tersimpan ✓'); }
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
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Nama panggilan</label>
      <input className="kp-input" value={namaPanggilan} onChange={(e) => setNamaPanggilan(e.target.value)} placeholder="(opsional) — dipakai di stiker event" />
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Jenis kelamin</label>
      <select className="kp-input" value={jk} onChange={(e) => setJk(e.target.value)}>
        <option value="">— belum diisi —</option>
        <option value="laki-laki">Laki-laki</option>
        <option value="perempuan">Perempuan</option>
      </select>
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Tanggal lahir</label>
      <input className="kp-input" type="date" max={maksTgl} value={tgl} onChange={(e) => setTgl(e.target.value)} />
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
