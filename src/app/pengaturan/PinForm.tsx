// src/app/pengaturan/PinForm.tsx
'use client';
import { useState } from 'react';
import { setPin } from '@/lib/data/ortu-actions';

export default function PinForm({ sudahAda }: { sudahAda: boolean }) {
  const [pin, setPinVal] = useState('');
  const [msg, setMsg] = useState('');
  async function simpan() {
    setMsg('');
    try { await setPin(pin); setMsg('PIN tersimpan ✓'); setPinVal(''); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
  }
  return (
    <div className="kp-card">
      <p style={{ fontSize: 13, color: 'var(--abu)', marginBottom: 8 }}>{sudahAda ? 'PIN sudah diatur. Masukkan PIN baru untuk mengganti.' : 'Buat PIN 4 angka untuk Gerbang Orang Tua.'}</p>
      <input className="kp-input" inputMode="numeric" maxLength={4} placeholder="4 angka" value={pin} onChange={(e) => setPinVal(e.target.value.replace(/\D/g, ''))} />
      {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={simpan}>Simpan PIN</button>
    </div>
  );
}
