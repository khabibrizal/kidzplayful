// src/app/admin/event/[id]/pendaftar/page.tsx
import { getEventAdmin, getPendaftaranByEvent, getSertifikatMapByEvent, getEventSemua } from '@/lib/data/admin-event';
import { getPesertaEvent, getEventBerParameter } from '@/lib/data/guru';
import type { BarisNilai } from '@/lib/game/tipe';
import ParameterPerkembanganForm from '@/components/ParameterPerkembanganForm';
import PendaftarAdmin from './PendaftarAdmin';
import s from '../../../admin.module.css';

export default async function PendaftarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ev, list, sertMap, semua, catatanData, opsiParam] = await Promise.all([
    getEventAdmin(id), getPendaftaranByEvent(id), getSertifikatMapByEvent(id),
    getEventSemua(), getPesertaEvent(id), getEventBerParameter(id),
  ]);
  const eventsAktif = semua.filter((e) => e.status === 'tampil' && e.id !== id).map((e) => ({ id: e.id, judul: e.judul, tanggal: e.tanggal }));
  const paramEvent = ev?.indikator_perkembangan ?? [];
  // catatan per anak (penilaian + catatan) untuk form nilai admin
  const catatanMap: Record<string, { penilaian: BarisNilai[]; catatan: string | null }> = {};
  for (const [anakId, c] of Object.entries(catatanData.catatan)) catatanMap[anakId] = { penilaian: c.penilaian ?? [], catatan: c.catatan ?? '' };

  return (
    <div>
      <h2 style={{ margin: '8px 0 14px' }}>👥 Pendaftar: {ev?.judul ?? 'Event'}</h2>

      <div className={s.section} style={{ marginTop: 0 }}>📊 Parameter Penilaian Tumbuh Kembang</div>
      <div className={s.card}>
        <p className={s.muted} style={{ fontSize: 12, marginTop: 0 }}>Area &amp; indikator ini dipakai untuk menilai semua anak di event ini. Educator/admin tinggal memberi nilai per anak.</p>
        <ParameterPerkembanganForm eventId={id} awal={paramEvent} opsiDuplikat={opsiParam} />
      </div>

      <div className={s.section}>Pendaftar</div>
      <PendaftarAdmin awal={list} sertMap={sertMap} eventsAktif={eventsAktif} params={paramEvent} catatanMap={catatanMap} />
    </div>
  );
}
