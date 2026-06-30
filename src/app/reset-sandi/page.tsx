// src/app/reset-sandi/page.tsx — set kata sandi baru (dibuka dari tautan email reset)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

export default function ResetSandiPage() {
  const router = useRouter();
  const [sandi, setSandi] = useState('');
  const [ulang, setUlang] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [sukses, setSukses] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (sandi.length < 6) return setErr('Kata sandi minimal 6 karakter.');
    if (sandi !== ulang) return setErr('Konfirmasi kata sandi tidak sama.');
    setLoading(true);
    const supabase = createClient();
    // Sesi pemulihan dibentuk otomatis dari tautan email (detectSessionInUrl).
    const { error } = await supabase.auth.updateUser({ password: sandi });
    setLoading(false);
    if (error) return setErr('Tautan reset tidak valid/kedaluwarsa. Minta tautan baru di halaman Lupa Kata Sandi.');
    setSukses(true);
    setTimeout(() => router.push('/pilih-anak'), 1500);
  }

  return (
    <main style={{ maxWidth: 380, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Logo height={48} /></div>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, marginBottom: 12, textAlign: 'center' }}>Kata Sandi Baru</h1>
      {sukses ? (
        <div className="kp-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <p style={{ marginTop: 6 }}>Kata sandi berhasil diganti. Mengarahkan…</p>
        </div>
      ) : (
        <form className="kp-card" onSubmit={submit}>
          <input className="kp-input" type="password" placeholder="Kata sandi baru (min 6)" value={sandi} onChange={(e) => setSandi(e.target.value)} minLength={6} required />
          <input className="kp-input" type="password" placeholder="Ulangi kata sandi" value={ulang} onChange={(e) => setUlang(e.target.value)} required />
          {err && <div className="kp-error">{err}</div>}
          <button className="kp-btn" type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'Menyimpan…' : 'Simpan kata sandi'}</button>
        </form>
      )}
    </main>
  );
}
