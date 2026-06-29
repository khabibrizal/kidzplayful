// src/app/kelas-saya/page.tsx — riwayat kelas bermain yang pernah dibuka user
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRiwayatKelas } from '@/lib/data/riwayat-kelas';
import BottomNav from '@/components/BottomNav';

export default async function KelasSayaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const riwayat = await getRiwayatKelas();

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16, paddingBottom: 90 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '6px 0 16px' }}>🎈 Kelas Bermain Saya</h1>
      <p style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 14 }}>Riwayat kelas bermain yang pernah kamu buka.</p>

      {riwayat.length === 0 ? (
        <p style={{ color: 'var(--abu)' }}>Belum ada riwayat. Buka kelas bermain dari Mode Anak, nanti muncul di sini.</p>
      ) : (
        riwayat.map((k) => (
          <a key={k.id} href={`/kelas/${k.id}`} className="kp-card"
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 22 }}>🎈</span>
            <span style={{ flex: 1 }}>
              <b>{k.judul}</b>
              {k.status === 'nonaktif' && <small style={{ color: 'var(--abu)' }}> (tidak aktif)</small>}
            </span>
            <span style={{ color: 'var(--abu)' }}>›</span>
          </a>
        ))
      )}

      <BottomNav />
    </main>
  );
}
