// src/app/main/[anakId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getPustaka } from '@/lib/data/pustaka';
import { umurTahun } from '@/lib/domain/anak';
import { kategoriUsia } from '@/lib/domain/usia';
import { getVideoByKategori } from '@/lib/data/video';
import { getKelasAktifCached } from '@/lib/data/publik';
import { getLabelFokusArea } from '@/lib/data/fokus-area';
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
  const [video0, pustaka0, kelasList0, favIds, { data: prof }, gami, status, labelArea] = await Promise.all([
    getVideoByKategori(kategoriUsia(umur)),
    getPustaka(),
    getKelasAktifCached(),
    getFavoritIds(),
    supabase.from('profiles').select('pin_ortu').eq('id', u!.id).single(),
    getGamifikasiAnak(anakId),
    getStatusLangganan(supabase, u!.id),
    getLabelFokusArea(),
  ]);

  // gating trial: item tetap TAMPIL untuk user non-aktif, tapi yang tak ditandai
  // "boleh trial" akan terkunci (🔒) di UI. Data dikirim penuh + flag `batasi`.
  const batasi = dibatasiTrial(status);
  if (pustaka0.length === 0) redirect('/pilih-anak');

  return (
    <>
    <RekamAktivitas fitur="game" anakId={anakId} />
    <MenuAnak
      anak={{ id: anak.id, nama: anak.nama, koin: anak.koin, batas_menit: anak.batas_menit }}
      pustaka={pustaka0}
      pinTersimpan={prof?.pin_ortu ?? null}
      video={video0}
      paketAwal={paketAwal}
      kelasList={kelasList0}
      favIds={favIds}
      gamiAwal={gami}
      batasi={batasi}
      labelArea={labelArea}
    />
    </>
  );
}
