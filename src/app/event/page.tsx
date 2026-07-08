// src/app/event/page.tsx — daftar semua event (sisi user)
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStatusPendaftaranSaya, getPesertaPerEvent } from '@/lib/data/event';
import { getEventTampilCached } from '@/lib/data/publik';
import { getEventBerCatatan } from '@/lib/data/catatan';
import EventCard from '@/components/EventCard';
import RekamAktivitas from '@/components/RekamAktivitas';
import BottomNav from '@/components/BottomNav';

export default async function EventListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [events, statusEvent, adaCatatan, peserta, { count: totalAnak }] = await Promise.all([
    getEventTampilCached(),
    getStatusPendaftaranSaya(),
    getEventBerCatatan(),
    getPesertaPerEvent(),
    supabase.from('anak').select('id', { count: 'exact', head: true }).eq('ortu_id', user.id),
  ]);
  const jumlahAnak = totalAnak ?? 0;

  return (
    <main className="kp-page" style={{ padding: 16, paddingBottom: 90, marginTop: 24 }}>
      <RekamAktivitas fitur="event" />
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '10px 0 16px' }}>✨ Event Kelas Bermain</h1>
      {events.length === 0
        ? <p style={{ color: 'var(--abu)' }}>Belum ada event saat ini.</p>
        : <div className="kp-grid-kartu">{events.map((ev) => <div key={ev.id}><EventCard ev={ev} status={statusEvent[ev.id]} peserta={peserta[ev.id]} sisaAnak={jumlahAnak - (peserta[ev.id]?.length ?? 0)} catatanHref={adaCatatan.has(ev.id) ? `/catatan/${ev.id}` : undefined} /></div>)}</div>}
      <BottomNav />
    </main>
  );
}
