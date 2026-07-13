// src/app/guru/[eventId]/page.tsx — isi catatan perkembangan tiap peserta
import Link from 'next/link';
import { getGuruTerjamin, getPesertaEvent } from '@/lib/data/guru';
import GuruNilai from './GuruNilai';

export default async function GuruEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  await getGuruTerjamin();
  const { eventId } = await params;
  const { event, peserta, catatan } = await getPesertaEvent(eventId);

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <Link href="/guru" style={{ color: 'var(--abu)', fontSize: 13 }}>← Daftar event</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: '8px 0 4px' }}>🎈 {event?.judul ?? 'Event'}</h1>
      <p style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 14 }}>Catatan Perkembangan Bermain — {peserta.length} anak peserta.</p>
      <GuruNilai eventId={eventId} peserta={peserta} catatanAwal={catatan} params={event?.indikator_perkembangan ?? []} />
    </main>
  );
}
