// src/app/komunitas/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFeed, getTopikOptions } from '@/lib/data/komunitas';
import Compose from './Compose';
import SukaBtn from './SukaBtn';
import LaporBtn from './LaporBtn';
import BottomNav from '@/components/BottomNav';

export default async function Komunitas({ searchParams }: { searchParams: Promise<{ topik?: string }> }) {
  const { topik: topikAwal } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [opsiTopik, feed] = await Promise.all([getTopikOptions(), getFeed()]);

  return (
    <main style={{ maxWidth: 480, margin: '20px auto', padding: 16, paddingBottom: 90 }}>
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 4px' }}>💬 Komunitas</h1>
      <p style={{ color: 'var(--abu)', fontSize: 12, marginBottom: 12 }}>Berbagi cerita & tips dengan sesama orang tua. Mohon santun & jaga privasi anak. 🌿</p>

      <Compose opsi={opsiTopik} topikAwal={topikAwal} />

      {feed.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada cerita. Jadilah yang pertama berbagi!</p>}
      {feed.map((p) => (
        <div key={p.id} className="kp-card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <b>{p.nama}</b>{(p.topik || p.tema) && <span className="kp-chip" style={{ fontSize: 11, padding: '2px 10px', boxShadow: 'none' }}>{p.topik ?? `${p.tema?.sampul ?? ''} ${p.tema?.nama}`}</span>}
          </div>
          <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{p.teks}</p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 13 }}>
            <SukaBtn postId={p.id} awalSuka={p.sukaSaya} awalJml={p.jmlSuka} />
            <Link href={`/komunitas/${p.id}`} style={{ color: 'var(--abu)' }}>💬 {p.jmlKomentar}</Link>
            <LaporBtn postinganId={p.id} />
          </div>
        </div>
      ))}
      <BottomNav />
    </main>
  );
}
