// src/app/main/[anakId]/page.tsx
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
import { getHakAnak } from '@/lib/data/langganan-anak';
import { getBulanKurikulumAnak } from '@/lib/data/kurikulum';
import { kelompokTema } from '@/lib/domain/kurikulum';
import { pathInternal } from '@/lib/nav';
import { getStatusWorksheet } from '@/lib/data/worksheet';
import RekamAktivitas from '@/components/RekamAktivitas';
import MenuAnak from './MenuAnak';

export default async function MainPage({ params, searchParams }: { params: Promise<{ anakId: string }>; searchParams: Promise<{ paket?: string; kembali?: string }> }) {
  const { anakId } = await params;
  const { paket: paketAwal, kembali } = await searchParams;
  // Tujuan `kembali` DIVALIDASI di server: parameter tujuan yang menerima URL apa pun
  // adalah lubang open redirect (lihat `lib/nav.ts`).
  const kembaliUrl = pathInternal(kembali);
  const anak = await getAnakTerjamin(anakId); // guard (login + langganan)
  const umur = umurTahun(new Date(anak.tanggal_lahir + 'T00:00:00Z'), new Date());
  const supabase = await createClient();
  const { data: { user: u } } = await supabase.auth.getUser();

  // Ambil semua data sisanya paralel (+ status langganan untuk gating trial)
  const [video0, pustaka0, kelasList0, favIds, { data: prof }, gami, status, labelArea, wsKuota] = await Promise.all([
    getVideoByKategori(kategoriUsia(umur)),
    getPustaka(),
    getKelasAktifCached(),
    getFavoritIds(),
    supabase.from('profiles').select('pin_ortu').eq('id', u!.id).single(),
    getGamifikasiAnak(anakId),
    getHakAnak(anakId),
    getLabelFokusArea(),
    getStatusWorksheet(),
  ]);

  // gating trial: item tetap TAMPIL untuk user non-aktif, tapi yang tak ditandai
  // "boleh trial" akan terkunci (🔒) di UI. Data dikirim penuh + flag `batasi`.
  // Hak akses kini milik ANAK, bukan akun: satu akun bisa punya anak Preschool dan anak
  // Basic. `batasi` = anak ini belum punya hak penuh atas game, jadi item yang tak ditandai
  // `boleh_trial` tampil terkunci.
  const batasi = !status.game;
  // Mode Anak hanya memuat tema yang SUDAH terbuka untuk anak ini (0098). Tema bulan
  // depan tak ditampilkan di sini sama sekali: judul-saja adalah bahasa untuk orang tua,
  // sedangkan bagi anak ia hanya jadi pintu yang tak bisa dibuka.
  const bulanAnak = await getBulanKurikulumAnak(anakId);
  const grupTema = kelompokTema(kelasList0, bulanAnak);
  const kelasTerbuka = [...grupTema.bulanIni, ...grupTema.sudahTerbuka];
  // CATATAN: pustaka kosong TIDAK lagi memantulkan ke `/pilih-anak`. Pantulan itu diam-diam
  // (klik kartu anak seolah tak berfungsi) padahal Mode Anak masih berguna tanpa game —
  // masih ada Ide Bermain, Pojok Video, koin & lencana. `MenuAnak` sendiri sudah punya
  // keadaan kosong "Belum ada game", yang selama ada redirect ini tak pernah bisa tampil.

  return (
    <>
    <RekamAktivitas fitur="game" anakId={anakId} />
    <MenuAnak
      anak={{ id: anak.id, nama: anak.nama, koin: anak.koin, batas_menit: anak.batas_menit }}
      pustaka={pustaka0}
      pinTersimpan={prof?.pin_ortu ?? null}
      video={video0}
      paketAwal={paketAwal}
      kembaliUrl={kembaliUrl}
      kelasList={kelasTerbuka}
      favIds={favIds}
      gamiAwal={gami}
      bolehWorksheet={status.worksheet && wsKuota.boleh}
      sisaWorksheet={wsKuota.sisa}
      worksheetTanpaBatas={wsKuota.tanpaBatas}
      batasi={batasi}
      labelArea={labelArea}
    />
    </>
  );
}
