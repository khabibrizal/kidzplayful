// src/app/catatan-tema/page.tsx — RESPONS guru/psikolog atas evaluasi orang tua.
//
// KONSEPNYA (koreksi pemilik): halaman ini bukan tempat menilai tema mana pun. Ia tempat
// MENANGGAPI evaluasi yang SUDAH DIISI ORANG TUA. Karena itu:
//   • yang didaftar hanya tema yang sudah dievaluasi orang tua untuk anak itu;
//   • isian orang tua ditampilkan apa adanya (per aktivitas) sebagai konteks;
//   • hasil game yang menempel pada aktivitas ikut ditampilkan — kosong bila anak memang
//     tak memainkannya, dan itu ditulis terus terang, bukan disamarkan jadi angka nol;
//   • penilaian guru/psikolog dilakukan PER TEMA, bukan per aktivitas.
//
// Kenapa rute SENDIRI di luar /admin: matriks Akses Menu hanya punya dimensi
// admin/investor/guru (`AksesMenu` & `menuUntukRole` di lib/menu-admin.ts) — TIDAK ada
// psikolog. Mendaftarkannya sebagai halaman /admin justru akan menutup akses psikolog.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKelasAktifCached } from '@/lib/data/publik';
import { getEvaluasiAnak } from '@/lib/data/kurikulum';
import { posisiTema, evaluasiPerAktivitas } from '@/lib/domain/kurikulum';
import { getAnakUntukPenulis, getCatatanTemaAnak, getAnakBerevaluasi, type PeranPenulis } from '@/lib/data/catatan-tema';
import { getRingkasGameAnak } from '@/lib/data/game-hasil';
import { getLabelFokusArea } from '@/lib/data/fokus-area';
import { formatTanggal } from '@/lib/format';
import TombolKembali from '@/components/TombolKembali';
import FormCatatanTema from './FormCatatanTema';

async function penulisTerjamin(): Promise<{ id: string; nama: string | null; peran: PeranPenulis }> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login');
  const { data: p } = await s.from('profiles')
    .select('nama_tampilan,is_admin,is_superuser,is_guru,is_psikolog').eq('id', user.id).maybeSingle();
  // Urutan sama dengan `simpanCatatanTema`: guru → psikolog → admin, supaya peran yang
  // ditampilkan di layar tak pernah berbeda dari yang tersimpan.
  const peran: PeranPenulis | null = p?.is_guru ? 'guru'
    : p?.is_psikolog ? 'psikolog'
      : (p?.is_admin || p?.is_superuser) ? 'admin' : null;
  // Pantulan WAJIB membawa alasan yang terbaca (aturan CLAUDE.md).
  if (!peran) redirect('/pilih-anak?galat=bukan-penulis-catatan');
  return { id: user.id, nama: (p?.nama_tampilan as string | null) ?? null, peran };
}

const jam = (detik: number) => (detik >= 60 ? `${Math.floor(detik / 60)}m ${detik % 60}d` : `${detik} detik`);

export default async function CatatanTemaPage(
  { searchParams }: { searchParams: Promise<{ anak?: string; kelas?: string }> },
) {
  const { anak: anakParam, kelas: kelasParam } = await searchParams;
  const penulis = await penulisTerjamin();

  const [anakSemua, kelasSemua, labelArea] = await Promise.all([
    getAnakUntukPenulis(penulis.peran), getKelasAktifCached(), getLabelFokusArea(),
  ]);

  // Hanya anak yang SUDAH punya evaluasi dari orang tua yang ditampilkan: tanpa evaluasi,
  // tak ada yang perlu ditanggapi, dan mendaftarkannya hanya membuat penulis membuka satu
  // per satu untuk menemukan halaman kosong. Diurutkan dari yang PALING BARU diisi —
  // itulah yang paling mungkin sedang ditunggu tanggapannya.
  const berevaluasi = await getAnakBerevaluasi(anakSemua.map((a) => a.id));
  const anakList = anakSemua
    .filter((a) => berevaluasi[a.id])
    .sort((x, y) => berevaluasi[y.id].terakhir.localeCompare(berevaluasi[x.id].terakhir));
  const anak = anakList.find((a) => a.id === anakParam) ?? anakList[0] ?? null;

  const [evaluasiSemua, catatanAnak] = anak
    ? await Promise.all([getEvaluasiAnak(anak.id), getCatatanTemaAnak(anak.id)])
    : [[], []];

  // HANYA tema yang sudah dievaluasi ORANG TUA — inilah yang perlu ditanggapi. Penilaian
  // guru/psikolog lain tidak memicu apa pun di sini.
  const evaluasiOrtu = evaluasiSemua.filter((e) => e.peran === 'ortu');
  const kelasById = new Map(kelasSemua.map((k) => [k.id, k]));

  const daftar = evaluasiOrtu.map((e) => {
    const kelas = kelasById.get(e.kelas_id) ?? null;
    const pos = posisiTema(kelasSemua, e.kelas_id);
    return {
      evaluasi: e,
      kelas,
      pos,
      judul: kelas?.judul ?? e.hasil[0]?.aktivitas ?? 'Tema',
      tercapai: e.hasil.filter((h) => h.tercapai).length,
      total: e.hasil.length,
      catatanSaya: catatanAnak.find((c) => c.kelas_id === e.kelas_id && c.penulis_id === penulis.id) ?? null,
      catatanLain: catatanAnak.filter((c) => c.kelas_id === e.kelas_id && c.penulis_id !== penulis.id),
    };
  });

  const dipilih = daftar.find((d) => d.evaluasi.kelas_id === kelasParam) ?? null;

  // Hasil game aktivitas pada tema terpilih. Paket yang tak ada di peta = belum dimainkan.
  const paketAktivitas = (dipilih?.kelas?.aktivitas ?? [])
    .map((a) => a.game_paket_id).filter((v): v is string => !!v);
  const hasilGame = dipilih && anak && paketAktivitas.length > 0
    ? await getRingkasGameAnak(anak.id, paketAktivitas)
    : {};

  return (
    <main className="kp-page" style={{ padding: 16, paddingBottom: 60, marginTop: 20 }}>
      <TombolKembali fallback={penulis.peran === 'guru' ? '/guru' : penulis.peran === 'psikolog' ? '/psikolog' : '/admin'}
        style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 4px' }}>🍎 Catatan Tema</h1>
      <p style={{ color: 'var(--abu)', fontSize: 12, marginBottom: 12 }}>
        Menanggapi <b>evaluasi yang sudah diisi orang tua</b>. Anda menulis sebagai <b>{penulis.peran}</b>
        {penulis.nama ? ` (${penulis.nama})` : ''}, satu catatan <b>per tema</b> — dan itu tampil di rapor anak.
        {penulis.peran === 'psikolog' && ' Hanya anak yang pernah konsultasi dengan Anda yang tampil di sini.'}
        {penulis.peran === 'guru' && ' Anak yang tampil adalah peserta event kelas bermain.'}
      </p>

      {anakList.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>
          {anakSemua.length === 0 ? (
            <>
              Belum ada anak yang bisa Anda tulisi catatannya.
              {penulis.peran === 'psikolog' && ' Daftar ini terisi setelah ada sesi konsultasi yang diterima atau selesai.'}
            </>
          ) : (
            <>Belum ada orang tua yang mengisi evaluasi tema. Halaman ini menampilkan anak yang evaluasinya
              sudah diisi — sebelum itu, belum ada yang perlu ditanggapi.</>
          )}
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--abu)' }}>Anak:</span>
            {anakList.slice(0, 30).map((a) => (
              <Link key={a.id} href={`/catatan-tema?anak=${a.id}`} className={a.id === anak?.id ? 'kp-btn mint' : 'kp-btn putih'}
                style={{ display: 'inline-block', fontSize: 13, padding: '6px 12px' }}>
                {a.nama} <span style={{ opacity: 0.7 }}>({berevaluasi[a.id].jumlah})</span>
              </Link>
            ))}
          </div>

          {anak && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>
                📋 EVALUASI YANG SUDAH DIISI ORANG TUA — {anak.nama.toUpperCase()}
              </div>
              {daftar.length === 0 && (
                <p style={{ color: 'var(--abu)', fontSize: 13 }}>
                  Belum ada evaluasi dari orang tua untuk anak ini. Catatan tema ditulis setelah orang tua
                  mengisi checklist sebuah tema — sebelum itu, belum ada yang perlu ditanggapi.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {daftar.map((d) => (
                  <Link key={d.evaluasi.kelas_id} href={`/catatan-tema?anak=${anak.id}&kelas=${d.evaluasi.kelas_id}`} className="kp-card"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', padding: 12, border: d.evaluasi.kelas_id === dipilih?.evaluasi.kelas_id ? '2px solid var(--lavender)' : undefined }}>
                    <span style={{ fontSize: 18 }}>🎈</span>
                    <span style={{ flex: 1 }}>
                      <b>{d.judul}</b>
                      <br />
                      <small style={{ color: 'var(--abu)' }}>
                        {d.pos ? `Bulan ke-${d.pos.bulan} · Minggu ke-${d.pos.minggu} · ` : ''}
                        diisi {formatTanggal(d.evaluasi.updated_at.slice(0, 10))} · {d.tercapai}/{d.total} tercapai
                        {d.catatanSaya ? ' · ✓ sudah Anda tanggapi' : ' · belum ditanggapi'}
                      </small>
                    </span>
                    <span style={{ color: 'var(--abu)' }}>›</span>
                  </Link>
                ))}
              </div>

              {dipilih && (
                <>
                  {/* Konteks 1: apa yang diisi orang tua, per aktivitas. Read-only —
                      penilaian guru/psikolog TIDAK menimpa penilaian orang tua. */}
                  <div className="kp-card" style={{ marginTop: 12, background: '#faf8ff' }}>
                    <b style={{ fontSize: 14 }}>📋 Isian orang tua — {dipilih.judul}</b>
                    <div style={{ fontSize: 12, color: 'var(--abu)' }}>
                      {dipilih.evaluasi.dinilai_oleh ? `${dipilih.evaluasi.dinilai_oleh} · ` : ''}
                      {formatTanggal(dipilih.evaluasi.updated_at.slice(0, 10))} · {dipilih.tercapai} dari {dipilih.total} tercapai
                    </div>
                    {evaluasiPerAktivitas(dipilih.evaluasi.hasil).map((g, i) => (
                      <div key={i} style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          🎯 {g.aktivitas} <span style={{ fontWeight: 400, color: g.belum.length === 0 ? 'var(--mint-d)' : 'var(--abu)' }}>· {g.tercapai}/{g.total} tercapai</span>
                        </div>
                        {g.belum.length > 0 && (
                          <ul style={{ margin: '2px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--abu)' }}>
                            {g.belum.map((b, j) => <li key={j} style={{ margin: '2px 0' }}>belum: {b}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Konteks 2: hasil game aktivitas. Belum dimainkan ditulis TERUS TERANG,
                      bukan disamarkan jadi 0 — nol berarti "sudah main tapi tak dapat apa-apa". */}
                  <div className="kp-card" style={{ marginTop: 8 }}>
                    <b style={{ fontSize: 14 }}>🎮 Hasil game pada aktivitas tema ini</b>
                    {(dipilih.kelas?.aktivitas ?? []).filter((a) => a.game_paket_id).length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--abu)', margin: '6px 0 0' }}>
                        Tak ada game yang dipasang admin pada aktivitas tema ini.
                      </p>
                    ) : (
                      (dipilih.kelas?.aktivitas ?? []).map((a, i) => {
                        if (!a.game_paket_id) return null;
                        const g = hasilGame[a.game_paket_id];
                        return (
                          <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
                            <b>🎯 {a.judul || `Aktivitas ${i + 1}`}</b>
                            {g ? (
                              <div style={{ color: 'var(--abu)' }}>
                                dimainkan {g.jumlahMain}× · ⭐ {g.totalBintang} · selesai {g.selesai}×
                                {g.tercepatDetik !== null ? ` · tercepat ${jam(g.tercepatDetik)}` : ''}
                                {g.terakhir ? ` · terakhir ${formatTanggal(g.terakhir.slice(0, 10))}` : ''}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--abu)' }}>— belum dimainkan</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <FormCatatanTema
                    anakId={anak.id} anakNama={anak.nama}
                    kelasId={dipilih.evaluasi.kelas_id} kelasJudul={dipilih.judul}
                    areaOpsi={(dipilih.kelas?.fokus_area ?? []).map((key) => ({ key, label: labelArea[key] ?? key }))}
                    awal={dipilih.catatanSaya ? { catatan: dipilih.catatanSaya.catatan, penilaian: dipilih.catatanSaya.penilaian } : null}
                  />

                  {/* Catatan penulis LAIN: konteks, tak bisa disunting (kunci unik per penulis). */}
                  {dipilih.catatanLain.map((c) => (
                    <div key={c.id} className="kp-card" style={{ marginTop: 8, background: '#f7f5fc' }}>
                      <div style={{ fontSize: 12, color: 'var(--abu)' }}>
                        Catatan {c.peran}{c.penulis_nama ? ` · ${c.penulis_nama}` : ''} · {formatTanggal(c.updated_at.slice(0, 10))}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{c.catatan}</p>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
