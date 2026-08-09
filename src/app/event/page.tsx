// src/app/event/page.tsx — daftar semua event (sisi user)
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPendaftaranSaya, getEventDiikuti } from '@/lib/data/event';
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
  const [events, pendaftaran, adaCatatan, { count: totalAnak }, diikuti] = await Promise.all([
    getEventTampilCached(),
    getPendaftaranSaya(user.id),
    getEventBerCatatan(),
    supabase.from('anak').select('id', { count: 'exact', head: true }).eq('ortu_id', user.id),
    getEventDiikuti(),
  ]);
  // Katalog di atas hanya memuat event berstatus 'tampil' (dibaca lewat client anon agar
  // bisa di-cache). Begitu admin mengarsipkan event yang sudah selesai, orang tua kehilangan
  // kartunya — padahal di kartu itulah tautan Catatan Perkembangan berada. Karena itu event
  // yang PERNAH DIIKUTI ditampilkan terpisah di bawah; RLS "event baca peserta" (0068)
  // mengizinkan ortu membaca event yang pernah ia daftari walau sudah diarsipkan.
  const idKatalog = new Set(events.map((e) => e.id));
  const arsip = diikuti.filter((d) => d.event && !idKatalog.has(d.event.id));
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
      {arsip.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '26px 0 8px' }}>EVENT YANG PERNAH DIIKUTI</div>
          <div className="kp-grid-kartu">
            {arsip.map(({ event: ev }) => (
              <div key={ev.id}>
                <EventCard ev={ev} status={statusEvent[ev.id]} peserta={peserta[ev.id]}
                  sisaAnak={jumlahAnak - (peserta[ev.id]?.filter((p) => p.status !== 'ditolak').length ?? 0)}
                  alasanTolak={pendaftaran.alasanMap[ev.id]}
                  catatanHref={adaCatatan.has(ev.id) ? `/catatan/${ev.id}` : undefined} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--abu)', marginTop: 8 }}>
            E-sertifikat & dokumentasi ada di <b>Rapor anak</b> → buka blok event-nya.
          </p>
        </>
      )}
      <BottomNav />
    </main>
  );
}
