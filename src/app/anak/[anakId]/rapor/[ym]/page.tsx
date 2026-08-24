// src/app/anak/[anakId]/rapor/[ym]/page.tsx — rapor bulanan satu anak (bisa diunduh JPEG).
//
// Inilah "barang" yang membuat orang tua merasa membeli preschool, bukan aplikasi game:
// ringkasan satu periode yang bisa disimpan & dibagikan.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKegiatanAnak } from '@/lib/data/kegiatan';
import { getHakAnak } from '@/lib/data/langganan-anak';
import { getKonsultasiAnak, getRekomendasiAnak } from '@/lib/data/konsultasi';
import { getRekomendasiItemAnak } from '@/lib/data/rekomendasi-item';
import { getEvaluasiAnak } from '@/lib/data/kurikulum';
import { getCatatanTemaAnak } from '@/lib/data/catatan-tema';
import { getKelasAktifCached } from '@/lib/data/publik';
import { metaSkala } from '@/lib/format';
import { getCatatanAnak } from '@/lib/data/catatan';
import { rentangBulan, labelBulan, ringkasBulan, bulanTerakhir } from '@/lib/domain/laporan-bulanan';
import { posisiTema, evaluasiPerAktivitas } from '@/lib/domain/kurikulum';
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
  const [kegiatan, { data: main }, catatanSemua, konsultasi, rekPsi, rekItem, evaluasiSemua, kelasSemua, catatanTemaSemua] = await Promise.all([
    getKegiatanAnak(anakId, rentang),
    // Kolom waktunya `tanggal` (migrasi 0002), bukan `created_at`/`dibuat_at` — memakai nama
    // yang salah akan gagal SENYAP dan membuat sesi game selalu 0.
    supabase.from('hasil_main').select('area_skill,bintang,durasi_detik,selesai,tanggal')
      .eq('anak_id', anakId).gte('tanggal', rentang.dari).lt('tanggal', rentang.sampai),
    getCatatanAnak(anakId),
    getKonsultasiAnak(anakId),
    getRekomendasiAnak(anakId),
    getRekomendasiItemAnak(anakId),
    getEvaluasiAnak(anakId),
    getKelasAktifCached(),
    getCatatanTemaAnak(anakId),
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

  // Rekomendasi psikolog & item disaring dengan `created_at` (waktu diberikannya), bukan
  // tanggal sesi: rekomendasi sering ditulis setelah chat selesai.
  const dalamRentang = (iso?: string | null) => !!iso && iso >= rentang.dari && iso < rentang.sampai;

  const judulKelas = new Map(kelasSemua.map((k) => [k.id, k.judul]));

  // Catatan guru/psikolog PER TEMA (0099) pada periode ini. Bentuknya sama persis dengan
  // catatan event (penilaian + catatan + penulis), jadi untuk JPEG keduanya masuk ke bagian
  // "Catatan perkembangan" yang sama — menambah bagian baru di kanvas hanya akan memicu
  // pertarungan ruang lagi, padahal isinya sejenis.
  const catatanTema = catatanTemaSemua.filter((c) => dalamRentang(c.updated_at));

  // `fokus_area` tema Ide Bermain yang dikerjakan bulan itu — bahan untuk "area paling
  // dilatih". Satu array per kegiatan, sebab satu tema bisa melatih beberapa area, dan
  // tema yang dikerjakan berulang memang layak berbobot lebih.
  // Tema yang sudah dinonaktifkan tak ada di `kelasSemua` → array kosong; sumber lain
  // (penilaian guru, sesi game) tetap mengisi hitungannya.
  const areaKelas = new Map(kelasSemua.map((k) => [k.id, k.fokus_area ?? []]));
  const fokusAreaIde = kegiatan
    .filter((k) => k.jenis === 'ide-bermain')
    .map((k) => (k.ref_id ? areaKelas.get(k.ref_id) ?? [] : []));

  const r = ringkasBulan({
    kegiatan,
    fokusAreaIde,
    hasilMain: (main ?? []) as { area_skill: string | null; bintang: number | null; durasi_detik: number | null; selesai: boolean | null }[],
    catatan: [
      ...catatanBulan.map((x) => ({
        judulEvent: x.judulEvent,
        dinilai_oleh: x.c.dinilai_oleh ?? null,
        penilaian: (x.c.penilaian ?? []).map((n) => ({ area: n.area, indikator: n.indikator, nilai: n.nilai })),
        catatan: x.c.catatan ?? null,
      })),
      // Catatan per TEMA ikut di sini supaya tercetak juga di JPEG; judulnya memakai nama
      // temanya, dan penulisnya disebut lengkap dengan perannya.
      ...catatanTema.map((c) => ({
        judulEvent: judulKelas.get(c.kelas_id) ?? 'Tema kurikulum',
        dinilai_oleh: `${c.penulis_nama ?? 'Tim KidzPlayful'} (${c.peran})`,
        penilaian: (c.penilaian ?? []).map((n) => ({ area: n.area, indikator: n.indikator, nilai: n.nilai })),
        catatan: c.catatan,
      })),
    ],
    event: [...new Set(catatanBulan.map((x) => x.judulEvent))],
    rekomendasi: konsultasi.filter((k) => k.tanggal >= rentang.dari.slice(0, 10) && k.tanggal < rentang.sampai.slice(0, 10)).length,
    rekomendasiPsikolog: rekPsi.filter((x) => dalamRentang(x.created_at)).map((x) => ({
      judul: x.judul ?? null, isi: x.isi ?? null,
      butir: (x.butir ?? []).map((b) => ({ judul: b.judul ?? null, isi: b.isi ?? null })),
      oleh: x.dinilai_oleh ?? null,
    })),
    rekomendasiItem: rekItem.filter((x) => dalamRentang(x.created_at)).map((x) => ({
      jenis: x.jenis, judul: x.judul ?? null, catatan: x.catatan ?? null, oleh: x.pemberi_nama ?? null,
    })),
    // Evaluasi kurikulum disaring dengan `updated_at` — waktu orang tua MENYIMPANNYA,
    // bukan waktu materinya dibuat. Judul temanya diambil dari katalog; bila materinya
    // sudah dihapus, dipakai judul dari butir tersimpan supaya barisnya tak jadi "—".
    evaluasi: evaluasiSemua.filter((e) => dalamRentang(e.updated_at)).map((e) => {
      // Bulan & minggu DITURUNKAN dari urutan tema di bulannya (4 tema/bulan = 1/minggu).
      const pos = posisiTema(kelasSemua, e.kelas_id);
      return {
        judulTema: judulKelas.get(e.kelas_id) ?? e.hasil[0]?.aktivitas ?? 'Tema',
        tercapai: e.hasil.filter((h) => h.tercapai).length,
        total: e.hasil.length,
        peran: e.peran,
        dinilaiOleh: e.dinilai_oleh ?? null,
        belum: e.hasil.filter((h) => !h.tercapai).map((h) => h.butir),
        bulan: pos?.bulan ?? null,
        minggu: pos?.minggu ?? null,
        perAktivitas: evaluasiPerAktivitas(e.hasil).map((g) => ({
          aktivitas: g.aktivitas, tercapai: g.tercapai, total: g.total,
        })),
      };
    }),
  });

  // Tiap KUNCI diterjemahkan lebih dulu, baru digabung — menerjemahkan string gabungan
  // ("motorik-halus & kognitif") tak akan pernah cocok dengan LABEL_AREA.
  const namaArea = r.areaTeratas.length
    ? r.areaTeratas.slice(0, 2).map((k) => LABEL_AREA[k] ?? k).join(' & ')
      + (r.areaTeratas.length > 2 ? ` & ${r.areaTeratas.length - 2} lainnya` : '')
    : null;
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

          {/* Catatan perkembangan LENGKAP dari event yang diikuti bulan ini — bukan cuma
              judul & penilainya. Inilah yang orang tua cari di rapor. */}
          {r.catatanGuru.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>📝 CATATAN PERKEMBANGAN</div>
              {r.catatanGuru.map((c, i) => (
                <div key={i} className="kp-card" style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>🎈 {c.judulEvent}</div>
                  {c.dinilai_oleh && <div style={{ fontSize: 12, color: 'var(--abu)' }}>dinilai {c.dinilai_oleh}</div>}
                  {c.penilaian.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {c.penilaian.map((n, j) => {
                        const m = metaSkala(n.nilai);
                        return (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', margin: '4px 0' }}>
                            <span style={{ fontSize: 13, flex: 1 }}>
                              <b style={{ color: 'var(--lavender-d)' }}>{n.area}</b> · {n.indikator}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: m.warna, background: m.bg, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                              {m.kode}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {c.catatan && <p style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>💬 {c.catatan}</p>}
                </div>
              ))}
            </>
          )}

          {r.event.length > 0 && r.catatanGuru.length === 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>🎈 KELAS BERMAIN YANG DIIKUTI</div>
              <div className="kp-card">
                {r.event.map((e) => <div key={e} style={{ fontSize: 13, margin: '3px 0' }}>• {e}</div>)}
              </div>
            </>
          )}

          {/* Catatan guru/psikolog per TEMA (0099) — terpisah dari checklist orang tua. */}
          {catatanTema.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>🍎 CATATAN GURU / PSIKOLOG PER TEMA</div>
              {catatanTema.map((c) => (
                <div key={c.id} className="kp-card" style={{ marginBottom: 8 }}>
                  <b style={{ fontSize: 14 }}>🎈 {judulKelas.get(c.kelas_id) ?? 'Tema kurikulum'}</b>
                  <div style={{ fontSize: 12, color: 'var(--abu)' }}>
                    {c.peran}{c.penulis_nama ? ` · ${c.penulis_nama}` : ''}
                  </div>
                  {c.penilaian.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
                      {c.penilaian.map((n, j) => (
                        <li key={j} style={{ margin: '2px 0' }}>{n.area ? `${n.area}: ` : ''}{n.indikator} — <b>{n.nilai}</b></li>
                      ))}
                    </ul>
                  )}
                  <p style={{ fontSize: 13, marginTop: 6, marginBottom: 0, whiteSpace: 'pre-wrap' }}>{c.catatan}</p>
                </div>
              ))}
            </>
          )}

          {/* Evaluasi kurikulum. Blok TERPISAH dari catatan guru: laporan diri orang tua dan
              penilaian pendidik tak setara sebagai bukti, jadi rapor menyebut penilainya. */}
          {r.evaluasi.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>📋 EVALUASI KURIKULUM</div>
              {evaluasiSemua.filter((e) => dalamRentang(e.updated_at)).map((e, i) => {
                const pos = posisiTema(kelasSemua, e.kelas_id);
                const perAktivitas = evaluasiPerAktivitas(e.hasil);
                const tercapai = e.hasil.filter((h) => h.tercapai).length;
                return (
                  <div key={i} className="kp-card" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14 }}>🎈 {judulKelas.get(e.kelas_id) ?? 'Tema'}</b>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--mint-d)' }}>{tercapai} dari {e.hasil.length} tercapai</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--abu)' }}>
                      {pos && <><b>Bulan ke-{pos.bulan} · Minggu ke-{pos.minggu}</b> · </>}
                      dinilai {e.peran === 'ortu' ? 'orang tua' : e.peran}{e.dinilai_oleh ? ` · ${e.dinilai_oleh}` : ''}
                    </div>
                    {/* Rincian per AKTIVITAS — nama tema saja tak cukup untuk tahu bagian
                        mana yang sudah dikuasai. */}
                    {perAktivitas.map((g, j) => (
                      <div key={j} style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          🎯 {g.aktivitas} <span style={{ fontWeight: 400, color: g.belum.length === 0 ? 'var(--mint-d)' : 'var(--abu)' }}>· {g.tercapai}/{g.total} tercapai</span>
                        </div>
                        {g.belum.length > 0 && (
                          <ul style={{ margin: '2px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--abu)' }}>
                            {g.belum.map((b, k) => <li key={k} style={{ margin: '2px 0' }}>belum: {b}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}

          {/* Hasil konsultasi psikolog: rekomendasi naratif + produk/event/ide bermain. */}
          {(r.rekomendasiPsikolog.length > 0 || r.rekomendasiItem.length > 0 || r.rekomendasi > 0) && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>🧠 HASIL KONSULTASI PSIKOLOG</div>
              {r.rekomendasi > 0 && (
                <p style={{ fontSize: 12, color: 'var(--abu)', margin: '0 0 6px' }}>{r.rekomendasi} sesi konsultasi pada periode ini.</p>
              )}
              {r.rekomendasiPsikolog.map((x, i) => (
                <div key={i} className="kp-card" style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{x.judul || 'Rekomendasi psikolog'}</div>
                  {x.oleh && <div style={{ fontSize: 12, color: 'var(--abu)' }}>oleh {x.oleh}</div>}
                  {x.isi && <p style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>{x.isi}</p>}
                  {x.butir.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
                      {x.butir.map((b, j) => (
                        <li key={j} style={{ margin: '2px 0' }}>{b.judul ? <b>{b.judul}: </b> : null}{b.isi}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {r.rekomendasiItem.length > 0 && (
                <div className="kp-card">
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🎁 Direkomendasikan untuk {nama}</div>
                  {r.rekomendasiItem.map((it, i) => (
                    <div key={i} style={{ fontSize: 13, margin: '3px 0' }}>
                      {it.jenis === 'produk' ? '🛍️' : it.jenis === 'event' ? '🎈' : '📚'} {it.judul ?? '—'}
                      <span style={{ color: 'var(--abu)', fontSize: 12 }}>
                        {' '}({it.jenis === 'materi' ? 'ide bermain' : it.jenis}){it.catatan ? ` · ${it.catatan}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <UnduhRaporBtn isi={{
              namaAnak: nama, periode,
              ideBermain: r.ideBermain, video: r.video, sesiGame: r.totalSesi,
              bintang: r.totalBintang, menit: r.totalMenit,
              totalAktivitas: r.totalAktivitas,
              areaDariMana: r.areaDariMana,
              areaTerbanyak: namaArea,
              daftarIdeBermain: r.daftarIdeBermain, daftarVideo: r.daftarVideo,
              event: r.event, catatanGuru: r.catatanGuru, rekomendasi: r.rekomendasi,
              rekomendasiPsikolog: r.rekomendasiPsikolog, rekomendasiItem: r.rekomendasiItem,
              evaluasi: r.evaluasi,
            }} />
          </div>
        </>
      )}
    </main>
  );
}
