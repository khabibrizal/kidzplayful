// src/app/lupa-sandi/page.tsx — minta tautan reset kata sandi via email
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Pewi from '@/components/ui/Pewi';

export default function LupaSandiPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [terkirim, setTerkirim] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-sandi`,
    });
    setLoading(false);
    if (error) return setErr(error.message);
    setTerkirim(true); // pesan generik (tidak membocorkan apakah email terdaftar)
  }

  return (
    <main style={{ maxWidth: 380, margin: '40px auto', padding: 16 }}>
      <div style={{ textAlign: 'center' }}><Pewi size={80} /></div>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, marginBottom: 6, textAlign: 'center' }}>Lupa Kata Sandi</h1>
      {terkirim ? (
        <div className="kp-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>📧</div>
          <p style={{ marginTop: 6 }}>Jika email terdaftar, kami sudah mengirim tautan untuk mengganti kata sandi. Cek kotak masuk (dan folder spam) ya.</p>
          <a href="/login" className="kp-btn" style={{ display: 'inline-block', marginTop: 12 }}>Kembali ke Masuk</a>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--abu)', marginBottom: 16, textAlign: 'center', fontSize: 14 }}>Masukkan email akun Anda, kami kirim tautan reset.</p>
          <form className="kp-card" onSubmit={submit}>
            <input className="kp-input" type="email" placeholder="Email orang tua" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {err && <div className="kp-error">{err}</div>}
            <button className="kp-btn" type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'Mengirim…' : 'Kirim tautan reset'}</button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
            <a href="/login" style={{ color: 'var(--biru-d)' }}>← Kembali ke Masuk</a>
          </p>
        </>
      )}
    </main>
  );
}
