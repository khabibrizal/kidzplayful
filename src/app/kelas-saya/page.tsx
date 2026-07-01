// src/app/kelas-saya/page.tsx — kelas bermain yang diikuti (event) + catatan, lalu riwayat materi
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRiwayatKelas } from '@/lib/data/riwayat-kelas';
import { getEventDiikuti } from '@/lib/data/event';
import { formatTanggal } from '@/lib/format';
import BottomNav from '@/components/BottomNav';

const STATUS: Record<string, { teks: string; warna: string; bg: string }> = {
  menunggu: { teks: 'Menunggu verifikasi', warna: '#b88600', bg: '#fff3d6' },
  diterima: { teks: 'Terdaftar', warna: '#1c7a43', bg: '#dff5e6' },
  ditolak: { teks: 'Ditolak', warna: '#b3261e', bg: '#fde8e6' },
};

export default async function KelasSayaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [diikuti, riwayat] = await Promise.all([getEventDiikuti(), getRiwayatKelas()]);

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16, paddingBottom: 90 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '6px 0 14px' }}>🎈 Kelas Bermain Saya</h1>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '0 0 8px' }}>KELAS BERMAIN YANG DIIKUTI</div>
      {diikuti.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum mengikuti kelas bermain (event). Lihat jadwal di menu <Link href="/event" style={{ color: 'var(--biru-d)' }}>Event</Link>.</p>
      ) : diikuti.map(({ event, status, adaCatatan }) => {
        const st = STATUS[status] ?? { teks: status, warna: 'var(--abu)', bg: '#eee' };
        return (
          <div key={event.id} className="kp-card" style={{ marginBottom: 10 }}>
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
      })}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '20px 0 8px' }}>MATERI YANG PERNAH DIBUKA</div>
      {riwayat.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada. Buka materi kelas bermain dari Mode Anak, nanti muncul di sini.</p>
      ) : riwayat.map((k) => (
        <a key={k.id} href={`/kelas/${k.id}`} className="kp-card"
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: 20 }}>🎈</span>
          <span style={{ flex: 1 }}><b>{k.judul}</b>{k.status === 'nonaktif' && <small style={{ color: 'var(--abu)' }}> (tidak aktif)</small>}</span>
          <span style={{ color: 'var(--abu)' }}>›</span>
        </a>
      ))}

      <BottomNav />
    </main>
  );
}
