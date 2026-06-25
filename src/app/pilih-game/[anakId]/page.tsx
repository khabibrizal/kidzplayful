// src/app/pilih-game/[anakId]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getPustaka } from '@/lib/data/pustaka';
import { umurTahun } from '@/lib/domain/anak';
import PilihGame from './PilihGame';

export default async function PilihGamePage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  await getAnakTerjamin(anakId); // guard
  const supabase = await createClient();
  const { data: anak } = await supabase.from('anak').select('nama,tanggal_lahir').eq('id', anakId).single();
  const pustaka = await getPustaka();
  const umur = anak ? umurTahun(new Date(anak.tanggal_lahir + 'T00:00:00Z'), new Date()) : 0;

  return <PilihGame anakId={anakId} nama={anak?.nama ?? 'Anak'} umur={umur} pustaka={pustaka} />;
}
