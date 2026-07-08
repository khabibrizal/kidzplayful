// src/app/favorit/page.tsx
// Daftar kelas bermain favorit milik ortu (dibuka dari tombol "Favoritmu" di dashboard).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFavoritKelas } from '@/lib/data/favorit';
import FavoritBtn from '@/components/FavoritBtn';
import BottomNav from '@/components/BottomNav';

export default async function FavoritPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const favorit = await getFavoritKelas();

  return (
    <main className="kp-page" style={{ padding: 16, paddingBottom: 90, marginTop: 30 }}>
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '10px 0 16px' }}>❤️ Kelas Bermain Favorit</h1>

      {favorit.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 14 }}>
          Belum ada favorit. Tandai kelas bermain dengan ikon 🤍 di Mode Anak untuk menyimpannya di sini.
        </p>
      ) : (
        <div className="kp-grid-kartu">{favorit.map((k) => (
          <div key={k.id} className="kp-card"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href={`/kelas/${k.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', flex: 1 }}>
              <span style={{ fontSize: 22 }}>🎈</span>
              <b>{k.judul}</b>
            </a>
            <FavoritBtn kelasId={k.id} awal={true} />
          </div>
        ))}</div>
      )}
      <BottomNav />
    </main>
  );
}
