// src/app/event/page.tsx — daftar semua event (sisi user)
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPendaftaranSaya } from '@/lib/data/event';
import { getEventTampilCached } from '@/lib/data/publik';
import { getEventBerCatatan } from '@/lib/data/catatan';
import EventCard from '@/components/EventCard';
import RekamAktivitas from '@/components/RekamAktivitas';
import BottomNav from '@/components/BottomNav';
import TombolKembali from '@/components/TombolKembali';

export default async function EventListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [events, pendaftaran, adaCatatan, { count: totalAnak }] = await Promise.all([
    getEventTampilCached(),
    getPendaftaranSaya(user.id),
    getEventBerCatatan(),
    supabase.from('anak').select('id', { count: 'exact', head: true }).eq('ortu_id', user.id),
  ]);
  const statusEvent = pendaftaran.statusMap;
  const peserta = pendaftaran.pesertaMap;
  const jumlahAnak = totalAnak ?? 0;

  return (
    <main className="kp-page" style={{ padding: 16, paddingBottom: 90, marginTop: 24 }}>
      <RekamAktivitas fitur="event" />
      <TombolKembali fallback="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '10px 0 16px' }}>✨ Event Kelas Bermain</h1>
      {events.length === 0
        ? <p style={{ color: 'var(--abu)' }}>Belum ada event saat ini.</p>
        : <div className="kp-grid-kartu">{events.map((ev) => <div key={ev.id}><EventCard ev={ev} status={statusEvent[ev.id]} peserta={peserta[ev.id]} sisaAnak={jumlahAnak - (peserta[ev.id]?.filter((p) => p.status !== 'ditolak').length ?? 0)} alasanTolak={pendaftaran.alasanMap[ev.id]} catatanHref={adaCatatan.has(ev.id) ? `/catatan/${ev.id}` : undefined} /></div>)}</div>}
      <BottomNav />
    </main>
  );
}
