// src/app/pilih-game/[anakId]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getPustaka } from '@/lib/data/pustaka';
import { umurTahun } from '@/lib/domain/anak';
import { getStatusSaya, dibatasiTrial } from '@/lib/data/langganan-status';
import Terkunci from '@/components/Terkunci';
import PilihGame from './PilihGame';

export default async function PilihGamePage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  await getAnakTerjamin(anakId); // guard
  const supabase = await createClient();
  const [{ data: anak }, pustaka0, status] = await Promise.all([
    supabase.from('anak').select('nama,tanggal_lahir').eq('id', anakId).single(),
    getPustaka(),
    getStatusSaya(),
  ]);
  // trial: hanya tema yang ditandai "boleh trial"
  const pustaka = dibatasiTrial(status) ? pustaka0.filter((t) => t.tema.boleh_trial !== false) : pustaka0;
  const umur = anak ? umurTahun(new Date(anak.tanggal_lahir + 'T00:00:00Z'), new Date()) : 0;

  if (pustaka.length === 0) {
    return <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}><Terkunci fitur="Game Edukasi" /></main>;
  }
  return <PilihGame anakId={anakId} nama={anak?.nama ?? 'Anak'} umur={umur} pustaka={pustaka} />;
}
