// src/app/kelas/[id]/page.tsx
// Detail kelas bermain mandiri (dibuka dari Favorit / Mode Anak / Mode Ortu). Bisa diunduh PDF.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';
import BeliBtn from '@/components/BeliBtn';
import YoutubeEmbed from '@/components/YoutubeEmbed';
import { youtubeId } from '@/lib/youtube';
import { rekamRiwayat } from '@/lib/data/riwayat-kelas';

const COLS = 'id,judul,aktivitas,bahan,link_ide,worksheet_url,status';

export default async function KelasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('kelas_bermain').select(COLS).eq('id', id).eq('status', 'aktif').maybeSingle();
  if (!data) redirect('/pilih-anak');
  const kelas = data as unknown as KelasBermain;
  await rekamRiwayat(kelas.id); // catat ke riwayat "Kelas Bermain Saya"

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <div className="no-print">
        <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali</Link>
      </div>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '10px 0 14px' }}>🎈 {kelas.judul}</h1>

      {kelas.bahan?.length > 0 && (
        <div className="kp-card" style={{ marginBottom: 12, background: '#fff3d6' }}>
          <b>🧺 Bahan</b>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {kelas.bahan.map((b, i) => (
              <li key={i} style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1 }}>{b.nama}</span>
                {(b.produk_id || b.link) && <BeliBtn nama={b.nama} link={b.link} produkId={b.produk_id} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {kelas.aktivitas?.map((a, ai) => (
        <div key={ai} className="kp-card" style={{ marginBottom: 10 }}>
          <b>🎯 {a.judul || `Aktivitas ${ai + 1}`}</b>
          {a.cara_membuat && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>🛠️ {a.cara_membuat}</p>}
          {a.langkah?.length > 0 && (
            <ol style={{ margin: '8px 0 0 18px', lineHeight: 1.7 }}>
              {a.langkah.map((l, i) => <li key={i}>{l}</li>)}
            </ol>
          )}
        </div>
      ))}

      {kelas.link_ide && youtubeId(kelas.link_ide) && (
        <div className="no-print"><YoutubeEmbed id={youtubeId(kelas.link_ide)!} title={kelas.judul} /></div>
      )}
      <div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {kelas.link_ide && !youtubeId(kelas.link_ide) && <a className="kp-btn" style={{ display: 'inline-block' }} href={kelas.link_ide} target="_blank">Lihat ide ▶</a>}
        {kelas.worksheet_url && <a className="kp-btn putih" style={{ display: 'inline-block' }} href={kelas.worksheet_url} target="_blank">📄 Worksheet</a>}
        <Link className="kp-btn putih" style={{ display: 'inline-block' }} href={`/komunitas?topik=${encodeURIComponent(kelas.judul)}`}>💬 Bagikan pengalaman</Link>
      </div>
    </main>
  );
}
