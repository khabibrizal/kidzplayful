// src/app/guru/[eventId]/page.tsx — isi catatan perkembangan tiap peserta
import Link from 'next/link';
import { getGuruTerjamin, getPesertaEvent } from '@/lib/data/guru';
import { getKatalogRekomendasi, getRekomendasiItemByAnakIds } from '@/lib/data/rekomendasi-item';
import { getFiturAkses } from '@/lib/data/pengaturan-menu';
import { fiturUntukRole } from '@/lib/menu-admin';
import GuruNilai from './GuruNilai';
import TombolKembali from '@/components/TombolKembali';

export default async function GuruEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const guru = await getGuruTerjamin();
  const { eventId } = await params;
  const { event, peserta, catatan } = await getPesertaEvent(eventId);
  const [katalog, fitur, itemMap] = await Promise.all([
    getKatalogRekomendasi(), getFiturAkses(), getRekomendasiItemByAnakIds(peserta.map((p) => p.anak_id)),
  ]);
  const fiturGuru = fiturUntukRole(fitur, { is_guru: true, is_admin: guru.isAdmin });
  const boleh = [...fiturGuru];
  const bolehNilai = fiturGuru.has('nilai');

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <TombolKembali fallback="/guru" style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: '8px 0 4px' }}>🎈 {event?.judul ?? 'Event'}</h1>
      <p style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 14 }}>Catatan Perkembangan Bermain — {peserta.length} anak peserta.</p>
      <GuruNilai eventId={eventId} peserta={peserta} catatanAwal={catatan} params={event?.indikator_perkembangan ?? []} katalog={katalog} boleh={boleh} itemMap={itemMap} bolehNilai={bolehNilai} />
    </main>
  );
}
