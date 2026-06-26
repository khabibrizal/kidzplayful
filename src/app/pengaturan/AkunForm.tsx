'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AkunForm({ email }: { email: string }) {
  const router = useRouter();
  const [sandi, setSandi] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function ganti() {
    setMsg('');
    if (sandi.length < 6) { setMsg('Kata sandi minimal 6 karakter.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: sandi });
    setLoading(false);
    if (error) setMsg(error.message);
    else { setMsg('Kata sandi diganti ✓'); setSandi(''); }
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="kp-card">
      <p style={{ fontSize: 13, color: 'var(--abu)', marginBottom: 8 }}>Masuk sebagai <b>{email}</b></p>
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Kata sandi baru</label>
      <input className="kp-input" type="password" value={sandi} minLength={6}
        onChange={(e) => setSandi(e.target.value)} placeholder="min 6 karakter" />
      {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={ganti} disabled={loading}>
        {loading ? '...' : 'Ganti Kata Sandi'}
      </button>
      <button onClick={logout}
        style={{ width: '100%', marginTop: 8, background: '#f3f3f8', color: 'var(--tinta)', border: 'none', borderRadius: 999, padding: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Keluar (Logout)
      </button>
    </div>
  );
}
