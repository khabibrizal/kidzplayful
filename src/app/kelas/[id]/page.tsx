// src/app/kelas/[id]/page.tsx
// Detail kelas bermain mandiri (dibuka dari Favorit / Mode Anak / Mode Ortu). Bisa diunduh PDF.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';
import KelasIsi from '@/components/KelasIsi';
import { rekamRiwayat } from '@/lib/data/riwayat-kelas';
import { getStatusLangganan, dibatasiTrial } from '@/lib/data/langganan-status';
import Terkunci from '@/components/Terkunci';
import TombolKembali from '@/components/TombolKembali';
import { getLabelFokusArea } from '@/lib/data/fokus-area';

const COLS = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';

export default async function KelasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data }, status, labelMaster] = await Promise.all([
    supabase.from('kelas_bermain').select(COLS).eq('id', id).eq('status', 'aktif').maybeSingle(),
    getStatusLangganan(supabase, user.id),
    getLabelFokusArea(),
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
      <KelasIsi kelas={kelas} labelArea={labelMaster} bagikanUrl={`/coba/kelas/${kelas.id}`} />
    </main>
  );
}
