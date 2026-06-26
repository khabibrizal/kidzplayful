// src/app/main/[anakId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getPustaka } from '@/lib/data/pustaka';
import { umurTahun } from '@/lib/domain/anak';
import { kategoriUsia } from '@/lib/domain/usia';
import { getVideoByKategori } from '@/lib/data/video';
import { getKelasBermain } from '@/lib/data/panduan';
import MenuAnak from './MenuAnak';

export default async function MainPage({ params, searchParams }: { params: Promise<{ anakId: string }>; searchParams: Promise<{ paket?: string }> }) {
  const { anakId } = await params;
  const { paket: paketAwal } = await searchParams;
  const anak = await getAnakTerjamin(anakId);
  const umur = umurTahun(new Date(anak.tanggal_lahir + 'T00:00:00Z'), new Date());
  const video = await getVideoByKategori(kategoriUsia(umur));
  const pustaka = await getPustaka();
  if (pustaka.length === 0) redirect('/pilih-anak');

  const mi = pustaka.find((t) => t.tema.is_minggu_ini) ?? pustaka[0] ?? null;
  const kelas = mi ? await getKelasBermain(mi.tema.id) : null;

  const supabase = await createClient();
  const { data: prof } = await supabase.from('profiles').select('pin_ortu').single();

  return (
    <MenuAnak
      anak={{ id: anak.id, koin: anak.koin, batas_menit: anak.batas_menit }}
      pustaka={pustaka}
      pinTersimpan={prof?.pin_ortu ?? null}
      video={video}
      paketAwal={paketAwal}
      kelas={kelas}
    />
  );
}
