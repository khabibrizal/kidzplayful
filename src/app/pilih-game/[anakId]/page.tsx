// src/app/pilih-game/[anakId]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getPustaka } from '@/lib/data/pustaka';
import { umurTahun } from '@/lib/domain/anak';
import { getHakAnak } from '@/lib/data/langganan-anak';
import PilihGame from './PilihGame';

export default async function PilihGamePage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  await getAnakTerjamin(anakId); // guard
  const supabase = await createClient();
  const [{ data: anak }, pustaka, status] = await Promise.all([
    supabase.from('anak').select('nama,tanggal_lahir').eq('id', anakId).single(),
    getPustaka(),
    getHakAnak(anakId),
  ]);
  const umur = anak ? umurTahun(new Date(anak.tanggal_lahir + 'T00:00:00Z'), new Date()) : 0;
  // item tetap tampil; yang tak "boleh trial" akan terkunci di PilihGame
  return <PilihGame anakId={anakId} nama={anak?.nama ?? 'Anak'} umur={umur} pustaka={pustaka} batasi={!status.game} />;
}
