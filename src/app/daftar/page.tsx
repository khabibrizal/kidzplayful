// src/app/daftar/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DaftarPage() {
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
    const { error } = await supabase.auth.signUp({ email, password: sandi });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push('/pilih-anak');
  }

  return (
    <main style={{ maxWidth: 380, margin: '40px auto', padding: 16 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 26, marginBottom: 4 }}>KidzPlayful</h1>
      <p style={{ color: 'var(--abu)', marginBottom: 18 }}>Daftar — gratis 14 hari, tanpa kartu.</p>
      <form className="kp-card" onSubmit={submit}>
        <input className="kp-input" type="email" placeholder="Email orang tua"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="kp-input" type="password" placeholder="Kata sandi (min 6)"
          value={sandi} onChange={(e) => setSandi(e.target.value)} minLength={6} required />
        {err && <div className="kp-error">{err}</div>}
        <button className="kp-btn" type="submit" disabled={loading}>
          {loading ? 'Memproses…' : 'Mulai Gratis ▶'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
        Sudah punya akun? <a href="/login" style={{ color: 'var(--biru-d)' }}>Masuk</a>
      </p>
    </main>
  );
}
