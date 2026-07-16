// src/app/admin/event/[id]/pendaftar/page.tsx
import { getEventAdmin, getPendaftaranByEvent, getSertifikatMapByEvent, getEventSemua } from '@/lib/data/admin-event';
import { getPesertaEvent, getEventBerParameter } from '@/lib/data/guru';
import { createClient } from '@/lib/supabase/server';
import { umurTeks } from '@/lib/domain/anak';
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

  // Umur tiap anak yang mendaftar (per hari ini). Admin bisa baca `anak` via RLS boleh_lihat_laporan_anak.
  const umurMap: Record<string, string> = {};
  const anakIds = [...new Set(list.flatMap((p) => p.anak_ids ?? []))];
  if (anakIds.length) {
    const supabase = await createClient();
    const { data: anakRows } = await supabase.from('anak').select('id,tanggal_lahir').in('id', anakIds);
    const now = new Date();
    for (const a of anakRows ?? []) {
      if (a.tanggal_lahir) umurMap[a.id as string] = umurTeks(new Date((a.tanggal_lahir as string) + 'T00:00:00Z'), now);
    }
  }

  return (
    <div>
      <h2 style={{ margin: '8px 0 14px' }}>👥 Pendaftar: {ev?.judul ?? 'Event'}</h2>

      <details className={s.card} style={{ marginTop: 0 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--lavender-d)' }}>📊 Parameter Penilaian Tumbuh Kembang</summary>
        <p className={s.muted} style={{ fontSize: 12, marginTop: 8 }}>Area &amp; indikator ini dipakai untuk menilai semua anak di event ini. Educator/admin tinggal memberi nilai per anak.</p>
        <ParameterPerkembanganForm eventId={id} awal={paramEvent} opsiDuplikat={opsiParam} />
      </details>

      <div className={s.section}>Pendaftar</div>
      <PendaftarAdmin awal={list} sertMap={sertMap} eventsAktif={eventsAktif} params={paramEvent} catatanMap={catatanMap} umurMap={umurMap} />
    </div>
  );
}
