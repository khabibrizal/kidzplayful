// src/app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: sandi });
    setLoading(false);
    if (error) return setErr('Email atau kata sandi salah.');
    router.push('/pilih-anak');
  }

  return (
    <main style={{ maxWidth: 380, margin: '40px auto', padding: 16 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 26, marginBottom: 18 }}>Masuk</h1>
      <form className="kp-card" onSubmit={submit}>
        <input className="kp-input" type="email" placeholder="Email orang tua"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="kp-input" type="password" placeholder="Kata sandi"
          value={sandi} onChange={(e) => setSandi(e.target.value)} required />
        {err && <div className="kp-error">{err}</div>}
        <button className="kp-btn" type="submit" disabled={loading}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
        Belum punya akun? <a href="/daftar" style={{ color: 'var(--biru-d)' }}>Daftar</a>
      </p>
    </main>
  );
}
