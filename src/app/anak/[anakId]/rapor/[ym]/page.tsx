// src/app/anak/[anakId]/rapor/[ym]/page.tsx — rapor bulanan satu anak (bisa diunduh JPEG).
//
// Inilah "barang" yang membuat orang tua merasa membeli preschool, bukan aplikasi game:
// ringkasan satu periode yang bisa disimpan & dibagikan.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKegiatanAnak } from '@/lib/data/kegiatan';
import { getHakAnak } from '@/lib/data/langganan-anak';
import { getKonsultasiAnak } from '@/lib/data/konsultasi';
import { getCatatanAnak } from '@/lib/data/catatan';
import { rentangBulan, labelBulan, ringkasBulan, bulanTerakhir } from '@/lib/domain/laporan-bulanan';
import { getEventInfoBanyak } from '@/lib/data/event';
import Terkunci from '@/components/Terkunci';
import UnduhRaporBtn from '@/components/UnduhRaporBtn';

const LABEL_AREA: Record<string, string> = {
  kognitif: 'Kognitif', 'motorik-halus': 'Motorik Halus', 'motorik-kasar': 'Motorik Kasar',
  sensorik: 'Sensorik', kemandirian: 'Kemandirian', kreativitas: 'Kreativitas',
  bahasa: 'Bahasa', 'sosial-emosional': 'Sosial-Emosional',
};

export default async function RaporBulananPage({ params }: { params: Promise<{ anakId: string; ym: string }> }) {
  const { anakId, ym } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: anak } = await supabase.from('anak').select('id,nama').eq('id', anakId).maybeSingle();
  if (!anak) redirect('/pilih-anak?galat=anak-tidak-ditemukan');

  const hak = await getHakAnak(anakId);
  const periode = labelBulan(ym);

  // Hak `raporBulanan` berasal dari paket ANAK ini (bukan akun): satu akun boleh punya anak
  // Preschool dan anak Basic sekaligus.
  if (!hak.raporBulanan) {
    return (
      <main className="kp-page-narrow" style={{ padding: 16, marginTop: 20 }}>
        <Link href={`/anak/${anakId}/laporan`} style={{ color: 'var(--abu)', fontSize: 13, textDecoration: 'none' }}>← Perkembangan</Link>
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: '8px 0 12px' }}>📄 Rapor {periode}</h1>
        <Terkunci fitur="Rapor Bulanan" />
      </main>
    );
  }

  const rentang = rentangBulan(ym);
  const [kegiatan, { data: main }, catatanSemua, konsultasi] = await Promise.all([
    getKegiatanAnak(anakId, rentang),
    // Kolom waktunya `tanggal` (migrasi 0002), bukan `created_at`/`dibuat_at` — memakai nama
    // yang salah akan gagal SENYAP dan membuat sesi game selalu 0.
    supabase.from('hasil_main').select('area_skill,bintang,durasi_detik,selesai,tanggal')
      .eq('anak_id', anakId).gte('tanggal', rentang.dari).lt('tanggal', rentang.sampai),
    getCatatanAnak(anakId),
    getKonsultasiAnak(anakId),
  ]);

  // Catatan guru & event pada periode ini. `catatan_perkembangan` tak punya tanggal event,
  // jadi tanggalnya diambil dari event-nya (kalau terbaca) — kalau tidak, dari created_at.
  const idEvent = [...new Set(catatanSemua.map((x) => x.c.event_id).filter((v): v is string => !!v))];
  const infoEvent = await getEventInfoBanyak(idEvent);
  const dalamPeriode = (iso: string | null) => !!iso && iso >= rentang.dari.slice(0, 10) && iso < rentang.sampai.slice(0, 10);
  const catatanBulan = catatanSemua.filter((x) => {
    const tgl = x.c.event_id ? infoEvent.get(x.c.event_id)?.tanggal ?? null : null;
    return tgl ? dalamPeriode(tgl) : (x.c.created_at >= rentang.dari && x.c.created_at < rentang.sampai);
  });

  const r = ringkasBulan({
    kegiatan,
    hasilMain: (main ?? []) as { area_skill: string | null; bintang: number | null; durasi_detik: number | null; selesai: boolean | null }[],
    catatan: catatanBulan.map((x) => ({ judulEvent: x.judulEvent, dinilai_oleh: x.c.dinilai_oleh ?? null })),
    event: [...new Set(catatanBulan.map((x) => x.judulEvent))],
    rekomendasi: konsultasi.filter((k) => k.tanggal >= rentang.dari.slice(0, 10) && k.tanggal < rentang.sampai.slice(0, 10)).length,
  });

  const namaArea = r.areaTerbanyak ? (LABEL_AREA[r.areaTerbanyak] ?? r.areaTerbanyak) : null;
  const nama = (anak.nama as string) ?? 'Anak';

  return (
    <main className="kp-page-narrow" style={{ padding: 16, paddingBottom: 60, marginTop: 20 }}>
      {/* Tujuan TETAP ke halaman Perkembangan, bukan `router.back()`: halaman ini punya chip
          pindah bulan, jadi riwayat browser akan membawa ke rapor bulan sebelumnya —
          bukan ke tempat orang tua datang. Labelnya juga menyebut tujuannya. */}
      <Link href={`/anak/${anakId}/laporan`} style={{ color: 'var(--abu)', fontSize: 13, textDecoration: 'none' }}>← Perkembangan</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 2px' }}>📄 Rapor {periode}</h1>
      <p style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 12 }}>{nama}</p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {bulanTerakhir(new Date(), 6).map((b) => (
          <Link key={b} href={`/anak/${anakId}/rapor/${b}`} className="kp-chip"
            style={{ textDecoration: 'none', background: b === ym ? 'var(--lavender-d)' : '#f3f0fb', color: b === ym ? '#fff' : 'var(--lavender-d)' }}>
            {labelBulan(b)}
          </Link>
        ))}
      </div>

      {!r.adaIsi ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>
          Belum ada aktivitas tercatat pada {periode}. Ide Bermain yang dibuka & video yang ditonton di Mode Anak akan muncul di sini.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { n: r.ideBermain, l: 'Ide Bermain' },
              { n: r.video, l: 'Video' },
              { n: r.totalSesi, l: 'Sesi game' },
              { n: r.totalMenit, l: 'Menit main' },
            ].map((k) => (
              <div key={k.l} className="kp-card" style={{ flex: '1 1 120px', textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{k.n}</div>
                <div style={{ fontSize: 12, color: 'var(--abu)' }}>{k.l}</div>
              </div>
            ))}
          </div>

          <div className="kp-card" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13 }}>⭐ <b>{r.totalBintang}</b> bintang terkumpul{namaArea ? <> · area paling dilatih: <b>{namaArea}</b></> : null}</div>
          </div>

          {r.daftarIdeBermain.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>🎈 IDE BERMAIN DI RUMAH</div>
              <div className="kp-card">
                {r.daftarIdeBermain.map((it) => (
                  <div key={it.judul} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                    <span>{it.judul}</span><span style={{ color: 'var(--abu)' }}>{it.jumlah}×</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {r.daftarVideo.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>📺 VIDEO YANG DITONTON</div>
              <div className="kp-card">
                {r.daftarVideo.map((it) => (
                  <div key={it.judul} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                    <span>{it.judul}</span><span style={{ color: 'var(--abu)' }}>{it.jumlah}×</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(r.event.length > 0 || r.catatanGuru.length > 0) && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>🎈 KELAS BERMAIN & CATATAN GURU</div>
              <div className="kp-card">
                {r.event.map((e) => <div key={e} style={{ fontSize: 13, margin: '3px 0' }}>• {e}</div>)}
                {r.catatanGuru.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--abu)', margin: '3px 0' }}>
                    📝 {c.judulEvent}{c.dinilai_oleh ? ` — dinilai ${c.dinilai_oleh}` : ''}
                  </div>
                ))}
              </div>
            </>
          )}

          {r.rekomendasi > 0 && (
            <p style={{ fontSize: 13, marginTop: 10 }}>🧠 {r.rekomendasi} sesi konsultasi psikolog pada periode ini.</p>
          )}

          <div style={{ marginTop: 16 }}>
            <UnduhRaporBtn isi={{
              namaAnak: nama, periode,
              ideBermain: r.ideBermain, video: r.video, sesiGame: r.totalSesi,
              bintang: r.totalBintang, menit: r.totalMenit,
              areaTerbanyak: namaArea,
              daftarIdeBermain: r.daftarIdeBermain, daftarVideo: r.daftarVideo,
              event: r.event, catatanGuru: r.catatanGuru, rekomendasi: r.rekomendasi,
            }} />
          </div>
        </>
      )}
    </main>
  );
}
