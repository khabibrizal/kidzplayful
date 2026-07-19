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
import { getStatusLangganan, dibatasiTrial } from '@/lib/data/langganan-status';
import Terkunci from '@/components/Terkunci';
import TombolKembali from '@/components/TombolKembali';

const COLS = 'id,judul,tujuan,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';

export default async function KelasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data }, status] = await Promise.all([
    supabase.from('kelas_bermain').select(COLS).eq('id', id).eq('status', 'aktif').maybeSingle(),
    getStatusLangganan(supabase, user.id),
  ]);
  if (!data) redirect('/pilih-anak');
  const kelas = data as unknown as KelasBermain;

  // gating trial: materi ini hanya untuk pelanggan bila tak ditandai "boleh trial"
  if (dibatasiTrial(status) && kelas.boleh_trial === false) {
    return <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}><Terkunci fitur="Materi Kelas Bermain" /></main>;
  }
  await rekamRiwayat(kelas.id); // catat ke riwayat "Kelas Bermain Saya"

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <div className="no-print">
        <TombolKembali fallback="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }} />
      </div>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '10px 0 6px' }}>🎈 {kelas.judul}</h1>
      {(kelas.tujuan || kelas.usia_min != null) && (
        <div className="kp-card" style={{ marginBottom: 14, background: '#f7f5fc' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>👶 Untuk usia {kelas.usia_min ?? 0}–{kelas.usia_max ?? 6} tahun</div>
          {kelas.tujuan && <p style={{ margin: '6px 0 0', fontSize: 14 }}>🎯 <b>Tujuan:</b> {kelas.tujuan}</p>}
        </div>
      )}

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
          {a.cara_membuat && (
            <>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🛠️ CARA MEMBUAT</div>
              <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.cara_membuat}</p>
            </>
          )}
          {a.langkah?.length > 0 && (
            <>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🎲 CARA BERMAIN</div>
              <ol style={{ margin: '4px 0 0 18px', lineHeight: 1.7 }}>
                {a.langkah.map((l, i) => <li key={i}>{l}</li>)}
              </ol>
            </>
          )}
          {a.catatan_ortu && (
            <div style={{ marginTop: 10, background: '#fff3d6', borderRadius: 12, padding: '8px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#b88600' }}>💡 CATATAN UNTUK ORANG TUA</div>
              <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{a.catatan_ortu}</p>
            </div>
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
