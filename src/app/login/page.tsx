// src/app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

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
    if (error) { setLoading(false); return setErr('Email atau kata sandi salah.'); }
    // arahkan guru ke area guru
    const { data: { user } } = await supabase.auth.getUser();
    let keGuru = false;
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('is_guru').eq('id', user.id).single();
      keGuru = !!prof?.is_guru;
    }
    setLoading(false);
    router.push(keGuru ? '/guru' : '/pilih-anak');
  }

  return (
    <main style={{ maxWidth: 380, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <Logo height={48} />
      </div>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 26, marginBottom: 18, textAlign: 'center' }}>Masuk</h1>
      <form className="kp-card" onSubmit={submit}>
        <input className="kp-input" type="email" placeholder="Email orang tua"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="kp-input" type="password" placeholder="Kata sandi"
          value={sandi} onChange={(e) => setSandi(e.target.value)} required />
        {err && <div className="kp-error">{err}</div>}
        <button className="kp-btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
        <p style={{ textAlign: 'right', marginTop: 10, fontSize: 13 }}>
          <a href="/lupa-sandi" style={{ color: 'var(--biru-d)' }}>Lupa kata sandi?</a>
        </p>
      </form>
      <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
        Belum punya akun? <a href="/daftar" style={{ color: 'var(--biru-d)' }}>Daftar</a>
      </p>
    </main>
  );
}
