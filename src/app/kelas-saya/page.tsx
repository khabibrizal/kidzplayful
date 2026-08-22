// src/app/kelas-saya/page.tsx — ide bermain yang diikuti (event) + catatan, lalu riwayat materi
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRiwayatKelas } from '@/lib/data/riwayat-kelas';
import { getEventDiikuti } from '@/lib/data/event';
import { formatTanggal } from '@/lib/format';
import RekamAktivitas from '@/components/RekamAktivitas';
import BottomNav from '@/components/BottomNav';
import PemilihAnak from '@/components/PemilihAnak';
import { getKelasAktifCached } from '@/lib/data/publik';
import { getBulanKurikulumAnak } from '@/lib/data/kurikulum';
import { kelompokTema, temaTerkunci, cocokUsia } from '@/lib/domain/kurikulum';
import { umurTahun } from '@/lib/domain/anak';

const STATUS: Record<string, { teks: string; warna: string; bg: string }> = {
  menunggu: { teks: 'Menunggu verifikasi', warna: '#b88600', bg: '#fff3d6' },
  diterima: { teks: 'Terdaftar', warna: '#1c7a43', bg: '#dff5e6' },
  ditolak: { teks: 'Ditolak', warna: '#b3261e', bg: '#fde8e6' },
};

export default async function KelasSayaPage({ searchParams }: { searchParams: Promise<{ anak?: string }> }) {
  const { anak: anakParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [diikuti, riwayat, kelasSemua, { data: anakList }] = await Promise.all([
    getEventDiikuti(), getRiwayatKelas(), getKelasAktifCached(),
    supabase.from('anak').select('id,nama,tanggal_lahir').eq('ortu_id', user.id).order('created_at'),
  ]);

  // Kurikulum berjalan PER ANAK: tema yang terbuka untuk kakak bisa masih terkunci untuk
  // adik. Tanpa `?anak=`, ambil anak pertama supaya halaman tetap berguna — pemilihnya
  // selalu terlihat.
  const anakSaya = (anakList ?? []) as { id: string; nama: string; tanggal_lahir?: string | null }[];
  const anakDipilih = anakSaya.find((a) => a.id === anakParam) ?? anakSaya[0] ?? null;
  const bulanAnak = anakDipilih ? await getBulanKurikulumAnak(anakDipilih.id) : 1;
  // Saring menurut usia anak terpilih; selisihnya disebut, tidak disembunyikan diam-diam.
  const umurAnak = anakDipilih?.tanggal_lahir
    ? umurTahun(new Date(anakDipilih.tanggal_lahir + 'T00:00:00Z'), new Date())
    : NaN;
  const kelasUsia = kelasSemua.filter((k) => cocokUsia(k, umurAnak));
  const diluarUsia = kelasSemua.length - kelasUsia.length;
  const grup = kelompokTema(kelasUsia, bulanAnak);
  const terkunciList = anakDipilih ? temaTerkunci(kelasUsia, bulanAnak) : [];
  const tautan = (id: string) => (anakDipilih ? `/kelas/${id}?anak=${anakDipilih.id}` : `/kelas/${id}`);

  return (
    <main className="kp-page" style={{ padding: 16, paddingBottom: 90, marginTop: 24 }}>
      <RekamAktivitas fitur="kelas" />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '6px 0 14px' }}>🎈 Ide Bermain Saya</h1>

      {anakSaya.length > 0 && (
        <>
          <PemilihAnak anak={anakSaya} terpilih={anakDipilih?.id ?? null} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '0 0 8px' }}>
            📚 KURIKULUM {anakDipilih ? anakDipilih.nama.toUpperCase() : ''} · BULAN KE-{bulanAnak}
          </div>
          {diluarUsia > 0 && (
            <div style={{ fontSize: 12, color: 'var(--abu)', margin: '-4px 0 8px' }}>
              {diluarUsia} tema disembunyikan karena di luar rentang usia {anakDipilih?.nama ?? 'anak'}
              {Number.isFinite(umurAnak) ? ` (${umurAnak} th)` : ''}.
            </div>
          )}

          {grup.bulanIni.length === 0 && grup.sudahTerbuka.length === 0 && (
            <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada tema untuk bulan ini.</p>
          )}

          {grup.bulanIni.length > 0 && (
            <div className="kp-grid-kartu" style={{ marginBottom: 12 }}>{grup.bulanIni.map((k) => (
              <a key={k.id} href={tautan(k.id)} className="kp-card" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                <span style={{ fontSize: 20 }}>🎈</span>
                <span style={{ flex: 1 }}><b>{k.judul}</b><br /><small style={{ color: 'var(--mint-d)' }}>bulan ini</small></span>
                <span style={{ color: 'var(--abu)' }}>›</span>
              </a>
            ))}</div>
          )}

          {grup.sudahTerbuka.length > 0 && (
            <details className="kp-card" style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                📖 Sudah terbuka ({grup.sudahTerbuka.length}) — tetap bisa dibuka kapan saja ▾
              </summary>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grup.sudahTerbuka.map((k) => (
                  <a key={k.id} href={tautan(k.id)} style={{ textDecoration: 'none', color: 'inherit', fontSize: 14 }}>
                    🎈 {k.judul}{typeof k.bulan_kurikulum === 'number' && k.bulan_kurikulum > 0 ? ` · bulan ke-${k.bulan_kurikulum}` : ''}
                  </a>
                ))}
              </div>
            </details>
          )}

          {/* Bulan depan: JUDUL SAJA. Isinya sengaja tak dimuat — inilah alasan menunggu
              bulan berikutnya, dan menampilkan 12 bulan sekaligus justru mematikannya. */}
          {/* Semua tema yang belum waktunya TETAP tampil, terkunci beserta bulan
              terbukanya — bukan disembunyikan. */}
          {terkunciList.length > 0 && (
            <div className="kp-card" style={{ marginBottom: 16, background: '#f7f5fc' }}>
              <b style={{ fontSize: 13 }}>⏳ Belum terbuka ({terkunciList.length})</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--abu)', fontSize: 14 }}>
                {terkunciList.map((k) => (
                  <li key={k.id}>{k.judul} <small>· bulan ke-{k.bulan_kurikulum}</small></li>
                ))}
              </ul>
              <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 6 }}>
                {anakDipilih?.nama ?? 'Anak'} sekarang di bulan ke-{bulanAnak}; tema di atas terbuka
                saat langganannya mencapai bulan yang tertulis.
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '0 0 8px' }}>KELAS BERMAIN YANG DIIKUTI</div>
      {diikuti.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum mengikuti event kelas bermain. Lihat jadwal di menu <Link href="/event" style={{ color: 'var(--biru-d)' }}>Event</Link>.</p>
      ) : <div className="kp-grid-kartu">{diikuti.map(({ event, status, adaCatatan }) => {
        const st = STATUS[status] ?? { teks: status, warna: 'var(--abu)', bg: '#eee' };
        return (
          <div key={event.id} className="kp-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <b>🎈 {event.judul}</b>
              <span style={{ fontSize: 11, fontWeight: 700, color: st.warna, background: st.bg, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>{st.teks}</span>
            </div>
            {event.tanggal && <div style={{ fontSize: 13, color: 'var(--abu)', marginTop: 4 }}>📅 {formatTanggal(event.tanggal)}</div>}
            {adaCatatan
              ? <Link href={`/catatan/${event.id}`} className="kp-btn" style={{ display: 'inline-block', marginTop: 10, fontSize: 13, padding: '8px 16px' }}>📋 Lihat Catatan Perkembangan</Link>
              : <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 8 }}>Catatan perkembangan belum tersedia.</div>}
          </div>
        );
      })}</div>}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '20px 0 8px' }}>MATERI YANG PERNAH DIBUKA</div>
      {riwayat.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada. Buka materi ide bermain dari Mode Anak, nanti muncul di sini.</p>
      ) : <div className="kp-grid-kartu">{riwayat.map((k) => (
        <a key={k.id} href={tautan(k.id)} className="kp-card"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: 20 }}>🎈</span>
          <span style={{ flex: 1 }}><b>{k.judul}</b>{k.status === 'nonaktif' && <small style={{ color: 'var(--abu)' }}> (tidak aktif)</small>}</span>
          <span style={{ color: 'var(--abu)' }}>›</span>
        </a>
      ))}</div>}

      <BottomNav />
    </main>
  );
}
