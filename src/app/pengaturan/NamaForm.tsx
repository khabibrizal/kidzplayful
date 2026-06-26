// src/app/pengaturan/NamaForm.tsx
'use client';
import { useState } from 'react';
import { setNamaTampilan } from '@/lib/data/komunitas-actions';
export default function NamaForm({ awal }: { awal: string }) {
  const [nama, setNama] = useState(awal);
  const [msg, setMsg] = useState('');
  async function simpan() { setMsg(''); try { await setNamaTampilan(nama); setMsg('Tersimpan ✓'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); } }
  return (
    <div className="kp-card" style={{ marginTop: 8 }}>
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Nama tampilan di komunitas</label>
      <input className="kp-input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Bunda Arka" />
      {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={simpan}>Simpan Nama</button>
    </div>
  );
}
