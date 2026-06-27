// src/app/kelas/[id]/page.tsx
// Detail kelas bermain mandiri (dibuka dari Favorit di dashboard).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';

const COLS = 'id,judul,aktivitas,bahan,cara_membuat,langkah,link_ide,worksheet_url,status';

export default async function KelasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('kelas_bermain').select(COLS).eq('id', id).eq('status', 'aktif').maybeSingle();
  if (!data) redirect('/pilih-anak');
  const kelas = data as unknown as KelasBermain;

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '10px 0 14px' }}>🎈 {kelas.judul}</h1>

      {kelas.aktivitas && (
        <div className="kp-card" style={{ marginBottom: 10 }}>
          <b>🎯 Aktivitas</b>
          <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{kelas.aktivitas}</p>
        </div>
      )}
      {kelas.bahan && (
        <div className="kp-card" style={{ marginBottom: 10, background: '#fff3d6' }}>
          <b>🧺 Bahan</b>
          <p style={{ marginTop: 6 }}>{kelas.bahan}</p>
        </div>
      )}
      {kelas.cara_membuat && (
        <div className="kp-card" style={{ marginBottom: 10 }}>
          <b>🛠️ Cara membuat</b>
          <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{kelas.cara_membuat}</p>
        </div>
      )}
      {kelas.langkah.length > 0 && (
        <div className="kp-card" style={{ marginBottom: 10 }}>
          <b>📝 Langkah aktivitas</b>
          <ol style={{ margin: '8px 0 0 18px', lineHeight: 1.7 }}>
            {kelas.langkah.map((l, i) => <li key={i}>{l}</li>)}
          </ol>
        </div>
      )}
      {kelas.link_ide && <a className="kp-btn" style={{ display: 'inline-block', marginRight: 8 }} href={kelas.link_ide} target="_blank">Lihat ide ▶</a>}
      {kelas.worksheet_url && <a className="kp-btn putih" style={{ display: 'inline-block' }} href={kelas.worksheet_url} target="_blank">📄 Worksheet</a>}
    </main>
  );
}
