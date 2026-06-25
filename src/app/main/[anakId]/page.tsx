// src/app/main/[anakId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getMingguIni } from '@/lib/data/tema';
import MenuAnak from './MenuAnak';

export default async function MainPage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const anak = await getAnakTerjamin(anakId);
  const mi = await getMingguIni();
  if (!mi) redirect('/pilih-anak');

  const supabase = await createClient();
  const { data: prof } = await supabase.from('profiles').select('pin_ortu').single();

  return (
    <MenuAnak
      anak={{ id: anak.id, koin: anak.koin, batas_menit: anak.batas_menit }}
      temaNama={mi.tema.nama} temaSampul={mi.tema.sampul ?? '🎈'} temaId={mi.tema.id}
      paket={mi.paket} pinTersimpan={prof?.pin_ortu ?? null}
    />
  );
}
