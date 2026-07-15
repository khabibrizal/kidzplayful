// src/app/konsultasi/page.tsx — customer: daftar & lihat konsultasi psikolog (khusus member aktif)
import Link from 'next/link';
import TombolKembali from '@/components/TombolKembali';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStatusLangganan } from '@/lib/data/langganan-status';
import { getPsikologTersedia, getAnakSaya, getKonsultasiSaya } from '@/lib/data/konsultasi';
import { formatTanggal } from '@/lib/format';
import Terkunci from '@/components/Terkunci';
import BottomNav from '@/components/BottomNav';
import RekamAktivitas from '@/components/RekamAktivitas';
import BookingForm from './BookingForm';
import BatalBtn from './BatalBtn';

const BADGE: Record<string, { teks: string; warna: string; bg: string }> = {
  menunggu: { teks: 'Menunggu persetujuan', warna: '#b88600', bg: '#fff3d6' },
  diterima: { teks: 'Diterima', warna: '#1c7a43', bg: '#dff5e6' },
  ditolak: { teks: 'Ditolak', warna: '#b3261e', bg: '#fde8e6' },
  selesai: { teks: 'Selesai', warna: '#3a78d6', bg: '#d6e6ff' },
  batal: { teks: 'Dibatalkan', warna: '#b3261e', bg: '#fde8e6' },
};

export default async function KonsultasiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fitur khusus member aktif
  const status = await getStatusLangganan(supabase, user.id);
  if (status !== 'aktif') {
    return <main className="kp-page-narrow" style={{ padding: 16, marginTop: 20 }}><Terkunci fitur="Konsultasi Psikolog" /><BottomNav /></main>;
  }

  const [psikolog, anak, sesi] = await Promise.all([getPsikologTersedia(), getAnakSaya(), getKonsultasiSaya()]);

  // Kelompokkan konsultasi per tanggal (terbaru dulu) — pola seperti blok event.
  const grup = new Map<string, typeof sesi>();
  for (const p of sesi) { const g = grup.get(p.tanggal); if (g) g.push(p); else grup.set(p.tanggal, [p]); }
  const perTanggal = [...grup.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <main className="kp-page-narrow" style={{ padding: 16, paddingBottom: 90, marginTop: 20 }}>
      <RekamAktivitas fitur="konsultasi" />
      <TombolKembali fallback="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 4px' }}>🧠 Konsultasi Psikolog</h1>
      <p style={{ color: 'var(--abu)', fontSize: 12, marginBottom: 12 }}>Daftar konsultasi lalu chat dengan psikolog. Rekomendasi akan tersimpan di laporan tumbuh kembang anak. 🌿</p>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>DAFTAR KONSULTASI BARU</div>
      <BookingForm psikolog={psikolog} anak={anak} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>KONSULTASI SAYA ({sesi.length})</div>
      {sesi.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada konsultasi.</p>}
      {perTanggal.map(([tgl, list]) => (
        <details key={tgl} className="kp-card" style={{ padding: 12, marginBottom: 8 }} open={list.some((p) => p.status === 'menunggu' || p.status === 'diterima')}>
          <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700 }}>
            <span>🗓️ {formatTanggal(tgl)}</span>
            <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--abu)' }}>{list.length} konsultasi ▾</span>
          </summary>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((p) => {
              const b = BADGE[p.status] ?? BADGE.menunggu;
              const adaChat = p.status === 'diterima' || p.status === 'selesai';
              return (
                <div key={p.id} style={{ borderTop: '1px solid #f4f1fa', paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span><b>🧒 {p.anak_nama || 'Anak'}</b></span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: b.warna, background: b.bg, borderRadius: 99, padding: '3px 10px' }}>{b.teks}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                    {adaChat && <Link href={`/konsultasi/${p.id}`} className="kp-btn" style={{ padding: '6px 14px', fontSize: 13 }}>{p.status === 'selesai' ? '📜 Riwayat chat' : '💬 Buka chat'}</Link>}
                    {(p.status === 'menunggu' || p.status === 'diterima') && <BatalBtn id={p.id} />}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ))}
      <BottomNav />
    </main>
  );
}
