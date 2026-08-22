// src/app/kelas/[id]/page.tsx
// Detail ide bermain mandiri (dibuka dari Favorit / Mode Anak / Mode Ortu). Bisa diunduh PDF.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';
import KelasIsi from '@/components/KelasIsi';
import { rekamRiwayat } from '@/lib/data/riwayat-kelas';
import { getHakAkun } from '@/lib/data/langganan-anak';
import { getStatusWorksheet } from '@/lib/data/worksheet';
import Terkunci from '@/components/Terkunci';
import TombolKembali from '@/components/TombolKembali';
import { getLabelFokusArea } from '@/lib/data/fokus-area';
import { getKonteksKurikulumAnak, getEvaluasiTema } from '@/lib/data/kurikulum';
import { cocokUsia } from '@/lib/domain/kurikulum';
import { statusTemaBracket } from '@/lib/domain/siklus-kurikulum';
import PemilihAnak from '@/components/PemilihAnak';

const COLS = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';
// Kolom 0089 dibaca dengan cadangan: bila migrasinya belum jalan, halaman ini tak boleh mati.
const COLS_089 = `${COLS},worksheet_terbuka`;
// Kolom 0098: tema tanpa `bulan_kurikulum` dianggap TERBUKA oleh `statusTema`, jadi
// cadangan ke COLS_089 aman — bukan berarti materinya terkunci.
const COLS_098 = `${COLS_089},bulan_kurikulum,urutan`;

export default async function KelasDetailPage(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ anak?: string }> },
) {
  const { id } = await params;
  const { anak: anakParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data }, status, ws, labelMaster, { data: anakList }] = await Promise.all([
    supabase.from('kelas_bermain').select(COLS_098).eq('id', id).eq('status', 'aktif').maybeSingle(),
    getHakAkun(),
    getStatusWorksheet(),
    getLabelFokusArea(),
    supabase.from('anak').select('id,nama,tanggal_lahir').eq('ortu_id', user.id).order('created_at'),
  ]);
  // Cadangan berjenjang bila kolom 0098 / 0089 belum ada.
  const baris = data
    ?? (await supabase.from('kelas_bermain').select(COLS_089).eq('id', id).eq('status', 'aktif').maybeSingle()).data
    ?? (await supabase.from('kelas_bermain').select(COLS).eq('id', id).eq('status', 'aktif').maybeSingle()).data;
  if (!baris) redirect('/pilih-anak?galat=materi-tidak-ditemukan');
  const kelas = baris as unknown as KelasBermain;

  // Kurikulum milik SATU anak. Tanpa `?anak=`, ambil anak pertama supaya halaman tetap
  // berguna; pemilihnya selalu terlihat sehingga orang tua bisa berpindah.
  const anakSaya = (anakList ?? []) as { id: string; nama: string; tanggal_lahir?: string | null }[];
  const anakDipilih = anakSaya.find((a) => a.id === anakParam) ?? anakSaya[0] ?? null;
  const ktx = anakDipilih ? await getKonteksKurikulumAnak(anakDipilih.id) : null;
  const bulanAnak = ktx?.bulanDalamBracket ?? 1;
  const st = ktx ? statusTemaBracket(kelas, ktx) : 'terbuka';
  // Usia: di halaman ini materi TIDAK diblokir — orang tua boleh membukanya sengaja
  // (mis. menyiapkan untuk kakaknya). Yang perlu ada hanyalah peringatan, supaya tak
  // salah kira materi ini memang untuk anak yang sedang dipilih.
  // Umur BEKU (awal siklus), bukan umur hari ini — supaya peringatannya sejalan dengan
  // daftar tema di halaman lain, yang juga memakai umur beku.
  const umurAnak = ktx?.umurBeku ?? NaN;
  const luarUsia = anakDipilih ? !cocokUsia(kelas, umurAnak) : false;
  const evaluasi = anakDipilih ? await getEvaluasiTema(anakDipilih.id, kelas.id, 'ortu') : null;

  // gating trial: materi ini hanya untuk pelanggan bila tak ditandai "boleh trial"
  // Detail materi tak punya konteks anak → pakai paket TERTINGGI di akun.
  if (!status.paketTertinggi && kelas.boleh_trial === false) {
    return <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}><Terkunci fitur="Materi Ide Bermain" /></main>;
  }
  // Tema yang belum terbuka untuk anak ini TIDAK dicatat sebagai "pernah dibuka" —
  // riwayat harus mencerminkan yang benar-benar dibaca.
  if (st === 'terbuka') await rekamRiwayat(kelas.id);

  const kepala = (
    <>
      <div className="no-print">
        <TombolKembali fallback="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }} />
      </div>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '10px 0 6px' }}>🎈 {kelas.judul}</h1>
      {anakSaya.length > 0 && <PemilihAnak anak={anakSaya} terpilih={anakDipilih?.id ?? null} />}
    </>
  );

  // Belum waktunya untuk anak ini: tampilkan judulnya + SEBABNYA, jangan memantulkan
  // diam-diam (aturan CLAUDE.md: redirect wajib membawa alasan yang terbaca).
  if (st !== 'terbuka') {
    return (
      <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
        {kepala}
        {kelas.sampul_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kelas.sampul_url} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 16, margin: '8px 0 12px', display: 'block', filter: 'grayscale(.5)' }} />
        )}
        <div className="kp-card" style={{ background: '#fff3d6' }}>
          <b>🔒 Belum terbuka untuk {anakDipilih?.nama ?? 'anak ini'}</b>
          <p style={{ margin: '6px 0 0', fontSize: 14 }}>
            Tema ini terbuka saat langganan {anakDipilih?.nama ?? 'anak'} masuk <b>bulan ke-{kelas.bulan_kurikulum}</b>.
            {' '}Sekarang {anakDipilih?.nama ?? 'anak'} ada di <b>bulan ke-{bulanAnak}</b>.
          </p>
          {anakSaya.length > 1 && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--abu)' }}>
              Kurikulum berjalan per anak, jadi tema yang sudah terbuka untuk kakak bisa belum terbuka untuk adik.
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      {kepala}
      {luarUsia && (
        <div className="kp-card" style={{ background: '#fff3d6', marginBottom: 10 }}>
          <b style={{ fontSize: 13, color: '#b88600' }}>ℹ️ Di luar rentang usia {anakDipilih?.nama}</b>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            Materi ini disarankan untuk usia {kelas.usia_min ?? 0}–{kelas.usia_max ?? 6} tahun, sedangkan
            {' '}{anakDipilih?.nama} berusia {Number.isFinite(umurAnak) ? `${umurAnak} tahun` : 'belum diisi tanggal lahirnya'}.
            Boleh tetap dicoba dengan pendampingan; di Mode Anak materi ini tidak ditampilkan.
          </p>
        </div>
      )}
      <KelasIsi kelas={kelas} labelArea={labelMaster} bagikanUrl={`/coba/kelas/${kelas.id}`} bolehWorksheet={ws.boleh} sisaWorksheet={ws.sisa} worksheetTanpaBatas={ws.tanpaBatas}
        anakId={anakDipilih?.id ?? null} anakNama={anakDipilih?.nama ?? null}
        evaluasiAwal={evaluasi?.hasil ?? []} evaluasiPeran={evaluasi?.peran ?? null} evaluasiWaktu={evaluasi?.updated_at ?? null}
        kembaliUrl={anakDipilih ? `/kelas/${kelas.id}?anak=${anakDipilih.id}` : undefined} />
    </main>
  );
}
