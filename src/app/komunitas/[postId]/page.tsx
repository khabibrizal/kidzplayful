// src/app/komunitas/[postId]/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPostingan } from '@/lib/data/komunitas';
import { getHakAkun } from '@/lib/data/langganan-anak';
import { getPengaturanTrial } from '@/lib/data/pengaturan-trial';
import KomentarForm from './KomentarForm';
import LaporBtn from '../LaporBtn';
import Terkunci from '@/components/Terkunci';
import TombolKembali from '@/components/TombolKembali';

export default async function DetailPost({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [akun, cfg] = await Promise.all([getHakAkun(), getPengaturanTrial()]);
  // Komunitas tak punya konteks anak → paket tertinggi di akun yang menentukan.
  if (!akun.komunitas && !cfg.trial_komunitas) {
    return <main style={{ maxWidth: 480, margin: '20px auto', padding: 16 }}><Terkunci fitur="Komunitas" /></main>;
  }

  const post = await getPostingan(postId);
  if (!post) redirect('/komunitas');

  return (
    <main style={{ maxWidth: 480, margin: '20px auto', padding: 16 }}>
      <TombolKembali fallback="/komunitas" style={{ color: 'var(--abu)', fontSize: 13 }} />
      <div className="kp-card" style={{ margin: '10px 0' }}>
        <b>{post.nama}</b>
        <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{post.teks}</p>
        <LaporBtn postinganId={post.id} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>KOMENTAR ({post.komentar.length})</div>
      {post.komentar.map((k) => (
        <div key={k.id} className="kp-card" style={{ marginBottom: 8, padding: 12 }}>
          <b style={{ fontSize: 13 }}>{k.nama}</b>
          <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{k.teks}</p>
          <LaporBtn komentarId={k.id} />
        </div>
      ))}
      <KomentarForm postId={postId} />
    </main>
  );
}
