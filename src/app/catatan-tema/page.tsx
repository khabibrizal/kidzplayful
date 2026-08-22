// src/app/catatan-tema/page.tsx — catatan perkembangan per TEMA oleh admin/guru/psikolog.
//
// Kenapa rute SENDIRI di luar /admin: matriks Akses Menu hanya punya dimensi
// admin/investor/guru (`AksesMenu` & `menuUntukRole` di lib/menu-admin.ts) — TIDAK ada
// psikolog. Mendaftarkannya sebagai menu admin justru akan menutup akses psikolog, orang
// yang justru diminta ikut mengisi. Menambah dimensi psikolog ke matriks (beserta tabel
// akses 0063 & halaman Akses Menu) adalah pekerjaan tersendiri.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKelasAktifCached } from '@/lib/data/publik';
import { getBulanKurikulumAnak } from '@/lib/data/kurikulum';
import { kelompokTema } from '@/lib/domain/kurikulum';
import { getAnakUntukPenulis, getCatatanTemaAnak, type PeranPenulis } from '@/lib/data/catatan-tema';
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
  // Pantulan WAJIB membawa alasan yang terbaca (aturan CLAUDE.md) — bukan diam-diam.
  if (!peran) redirect('/pilih-anak?galat=bukan-penulis-catatan');
  return { id: user.id, nama: (p?.nama_tampilan as string | null) ?? null, peran };
}

export default async function CatatanTemaPage(
  { searchParams }: { searchParams: Promise<{ anak?: string; kelas?: string }> },
) {
  const { anak: anakParam, kelas: kelasParam } = await searchParams;
  const penulis = await penulisTerjamin();

  const [anakList, kelasSemua, labelArea] = await Promise.all([
    getAnakUntukPenulis(penulis.peran), getKelasAktifCached(), getLabelFokusArea(),
  ]);
  const anak = anakList.find((a) => a.id === anakParam) ?? anakList[0] ?? null;

  // Tema yang SUDAH terbuka untuk anak itu — menulis catatan untuk tema yang belum ia
  // kerjakan tak ada gunanya.
  const bulanAnak = anak ? await getBulanKurikulumAnak(anak.id) : 1;
  const grup = anak ? kelompokTema(kelasSemua, bulanAnak) : { bulanIni: [], sudahTerbuka: [], bulanDepan: [] };
  const temaTerbuka = [...grup.bulanIni, ...grup.sudahTerbuka];

  const catatanAnak = anak ? await getCatatanTemaAnak(anak.id) : [];
  const punyaCatatanSaya = new Map(catatanAnak.filter((c) => c.penulis_id === penulis.id).map((c) => [c.kelas_id, c]));
  const jumlahLain = new Map<string, number>();
  for (const c of catatanAnak) {
    if (c.penulis_id === penulis.id) continue;
    jumlahLain.set(c.kelas_id, (jumlahLain.get(c.kelas_id) ?? 0) + 1);
  }

  const kelasDipilih = temaTerbuka.find((k) => k.id === kelasParam) ?? null;
  const catatanSaya = kelasDipilih ? punyaCatatanSaya.get(kelasDipilih.id) ?? null : null;
  const tautan = (kelasId?: string) =>
    `/catatan-tema?anak=${anak?.id ?? ''}${kelasId ? `&kelas=${kelasId}` : ''}`;

  return (
    <main className="kp-page" style={{ padding: 16, paddingBottom: 60, marginTop: 20 }}>
      <TombolKembali fallback={penulis.peran === 'guru' ? '/guru' : penulis.peran === 'psikolog' ? '/psikolog' : '/admin'}
        style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 4px' }}>🍎 Catatan Tema</h1>
      <p style={{ color: 'var(--abu)', fontSize: 12, marginBottom: 12 }}>
        Catatan perkembangan anak pada tema kurikulum yang ia kerjakan di rumah. Anda menulis sebagai <b>{penulis.peran}</b>
        {penulis.nama ? ` (${penulis.nama})` : ''}, dan itu ikut tampil di rapor anak.
        {penulis.peran === 'psikolog' && ' Hanya anak yang pernah konsultasi dengan Anda yang tampil di sini.'}
        {penulis.peran === 'guru' && ' Anak yang tampil adalah peserta event kelas bermain.'}
      </p>

      {anakList.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>
          Belum ada anak yang bisa Anda tulisi catatannya.
          {penulis.peran === 'psikolog' && ' Daftar ini terisi setelah ada sesi konsultasi yang diterima atau selesai.'}
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--abu)' }}>Anak:</span>
            {anakList.slice(0, 30).map((a) => (
              <Link key={a.id} href={`/catatan-tema?anak=${a.id}`} className={a.id === anak?.id ? 'kp-btn mint' : 'kp-btn putih'}
                style={{ display: 'inline-block', fontSize: 13, padding: '6px 12px' }}>{a.nama}</Link>
            ))}
          </div>

          {anak && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '12px 0 6px' }}>
                📚 TEMA YANG SUDAH TERBUKA UNTUK {anak.nama.toUpperCase()} · BULAN KE-{bulanAnak}
              </div>
              {temaTerbuka.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada tema terbuka untuk anak ini.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {temaTerbuka.map((k) => {
                  const milikSaya = punyaCatatanSaya.get(k.id);
                  const lain = jumlahLain.get(k.id) ?? 0;
                  return (
                    <Link key={k.id} href={tautan(k.id)} className="kp-card"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', padding: 12, border: k.id === kelasDipilih?.id ? '2px solid var(--lavender)' : undefined }}>
                      <span style={{ fontSize: 18 }}>🎈</span>
                      <span style={{ flex: 1 }}>
                        <b>{k.judul}</b>
                        <br />
                        <small style={{ color: milikSaya ? 'var(--mint-d)' : 'var(--abu)' }}>
                          {milikSaya ? `✓ catatan Anda tersimpan · ${formatTanggal(milikSaya.updated_at.slice(0, 10))}` : 'belum Anda tulisi'}
                          {lain > 0 ? ` · ${lain} catatan dari penulis lain` : ''}
                        </small>
                      </span>
                      <span style={{ color: 'var(--abu)' }}>›</span>
                    </Link>
                  );
                })}
              </div>

              {kelasDipilih && (
                <FormCatatanTema
                  anakId={anak.id} anakNama={anak.nama}
                  kelasId={kelasDipilih.id} kelasJudul={kelasDipilih.judul}
                  areaOpsi={(kelasDipilih.fokus_area ?? []).map((key) => ({ key, label: labelArea[key] ?? key }))}
                  awal={catatanSaya ? { catatan: catatanSaya.catatan, penilaian: catatanSaya.penilaian } : null}
                />
              )}

              {/* Catatan penulis LAIN ditampilkan read-only: berguna sebagai konteks, tapi
                  tak boleh bisa disunting — kunci uniknya per penulis. */}
              {kelasDipilih && catatanAnak.filter((c) => c.kelas_id === kelasDipilih.id && c.penulis_id !== penulis.id).map((c) => (
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
    </main>
  );
}
