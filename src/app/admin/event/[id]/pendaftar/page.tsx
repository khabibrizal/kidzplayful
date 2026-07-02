// src/app/admin/event/[id]/pendaftar/page.tsx
import { getEventAdmin, getPendaftaranByEvent, getSertifikatMapByEvent } from '@/lib/data/admin-event';
import PendaftarAdmin from './PendaftarAdmin';

export default async function PendaftarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = await getEventAdmin(id);
  const list = await getPendaftaranByEvent(id);
  const sertMap = await getSertifikatMapByEvent(id);

  return (
    <div>
      <h2 style={{ margin: '8px 0 14px' }}>👥 Pendaftar: {ev?.judul ?? 'Event'}</h2>
      <PendaftarAdmin awal={list} sertMap={sertMap} />
    </div>
  );
}
