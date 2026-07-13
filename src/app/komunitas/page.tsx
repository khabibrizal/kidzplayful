// src/app/komunitas/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFeed, getTopikOptions } from '@/lib/data/komunitas';
import { getStatusLangganan, dibatasiTrial } from '@/lib/data/langganan-status';
import { getPengaturanTrial } from '@/lib/data/pengaturan-trial';
import Compose from './Compose';
import RekamAktivitas from '@/components/RekamAktivitas';
import SukaBtn from './SukaBtn';
import LaporBtn from './LaporBtn';
import Terkunci from '@/components/Terkunci';
import BottomNav from '@/components/BottomNav';

export default async function Komunitas({ searchParams }: { searchParams: Promise<{ topik?: string }> }) {
  const { topik: topikAwal } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // gating trial: fitur Komunitas bisa dimatikan admin untuk user belum berlangganan
  const [status, cfg] = await Promise.all([getStatusLangganan(supabase, user.id), getPengaturanTrial()]);
  if (dibatasiTrial(status) && !cfg.trial_komunitas) {
    return <main className="kp-page-narrow" style={{ padding: 16, marginTop: 20 }}><Terkunci fitur="Komunitas" /><BottomNav /></main>;
  }

  const [opsiTopik, feed] = await Promise.all([getTopikOptions(), getFeed()]);

  return (
    <main className="kp-page-narrow" style={{ padding: 16, paddingBottom: 90, marginTop: 20 }}>
      <RekamAktivitas fitur="komunitas" />
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
