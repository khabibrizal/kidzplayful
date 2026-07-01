// src/app/pengaturan/ProfilPengirimanForm.tsx — No HP + Alamat (untuk auto-isi checkout Store)
'use client';
import { useState } from 'react';
import { simpanProfilPengiriman } from '@/lib/data/ortu-actions';

export default function ProfilPengirimanForm({ awalNoWa, awalAlamat }: { awalNoWa: string; awalAlamat: string }) {
  const [noWa, setNoWa] = useState(awalNoWa);
  const [alamat, setAlamat] = useState(awalAlamat);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function simpan() {
    setMsg(''); setLoading(true);
    try { await simpanProfilPengiriman({ noWa, alamat }); setMsg('Tersimpan ✓'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }

  return (
    <div className="kp-card" style={{ marginTop: 8 }}>
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>No. HP / WhatsApp</label>
      <input className="kp-input" type="tel" value={noWa} onChange={(e) => setNoWa(e.target.value)} placeholder="mis. 081234567890" />
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Alamat lengkap</label>
      <textarea className="kp-input" rows={3} value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Jalan, kota, kode pos" style={{ resize: 'vertical' }} />
      {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={simpan} disabled={loading}>{loading ? 'Menyimpan…' : 'Simpan Data Pengiriman'}</button>
    </div>
  );
}
