// src/app/main/[anakId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getPustaka } from '@/lib/data/pustaka';
import { umurTahun } from '@/lib/domain/anak';
import { kategoriUsia } from '@/lib/domain/usia';
import { getVideoByKategori } from '@/lib/data/video';
import { getKelasAktifCached } from '@/lib/data/publik';
import { getFavoritIds } from '@/lib/data/favorit';
import { getGamifikasiAnak } from '@/lib/data/gamifikasi';
import { getStatusLangganan, dibatasiTrial } from '@/lib/data/langganan-status';
import RekamAktivitas from '@/components/RekamAktivitas';
import MenuAnak from './MenuAnak';

export default async function MainPage({ params, searchParams }: { params: Promise<{ anakId: string }>; searchParams: Promise<{ paket?: string }> }) {
  const { anakId } = await params;
  const { paket: paketAwal } = await searchParams;
  const anak = await getAnakTerjamin(anakId); // guard (login + langganan)
  const umur = umurTahun(new Date(anak.tanggal_lahir + 'T00:00:00Z'), new Date());
  const supabase = await createClient();
  const { data: { user: u } } = await supabase.auth.getUser();

  // Ambil semua data sisanya paralel (+ status langganan untuk gating trial)
  const [video0, pustaka0, kelasList0, favIds, { data: prof }, gami, status] = await Promise.all([
    getVideoByKategori(kategoriUsia(umur)),
    getPustaka(),
    getKelasAktifCached(),
    getFavoritIds(),
    supabase.from('profiles').select('pin_ortu').eq('id', u!.id).single(),
    getGamifikasiAnak(anakId),
    getStatusLangganan(supabase, u!.id),
  ]);

  // gating trial: user non-aktif hanya melihat item yang ditandai "boleh trial" oleh admin
  const batasi = dibatasiTrial(status);
  const pustaka = batasi ? pustaka0.filter((t) => t.tema.boleh_trial !== false) : pustaka0;
  const kelasList = batasi ? kelasList0.filter((k) => k.boleh_trial !== false) : kelasList0;
  const video = batasi ? video0.filter((v) => v.boleh_trial !== false) : video0;
  if (!batasi && pustaka.length === 0) redirect('/pilih-anak'); // non-trial tapi tak ada konten sama sekali

  return (
    <>
    <RekamAktivitas fitur="game" anakId={anakId} />
    <MenuAnak
      anak={{ id: anak.id, nama: anak.nama, koin: anak.koin, batas_menit: anak.batas_menit }}
      pustaka={pustaka}
      pinTersimpan={prof?.pin_ortu ?? null}
      video={video}
      paketAwal={paketAwal}
      kelasList={kelasList}
      favIds={favIds}
      gamiAwal={gami}
      batasi={batasi}
    />
    </>
  );
}
