// src/app/admin/event/[id]/pendaftar/page.tsx
import { getEventAdmin, getPendaftaranByEvent, getSertifikatMapByEvent, getEventSemua } from '@/lib/data/admin-event';
import { getPesertaEvent, getEventBerParameter } from '@/lib/data/guru';
import { getKuotaEvent } from '@/lib/data/event';
import { createClient } from '@/lib/supabase/server';
import { umurTeks, umurBulanTotal } from '@/lib/domain/anak';
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
  const kuotaEvent = await getKuotaEvent(id);
  const eventsAktif = semua.filter((e) => e.status === 'tampil' && e.id !== id).map((e) => ({ id: e.id, judul: e.judul, tanggal: e.tanggal }));
  const paramEvent = ev?.indikator_perkembangan ?? [];
  // catatan per anak (penilaian + catatan) untuk form nilai admin
  const catatanMap: Record<string, { penilaian: BarisNilai[]; catatan: string | null }> = {};
  for (const [anakId, c] of Object.entries(catatanData.catatan)) catatanMap[anakId] = { penilaian: c.penilaian ?? [], catatan: c.catatan ?? '' };

  // Umur tiap anak yang mendaftar (per hari ini). Admin bisa baca `anak` via RLS boleh_lihat_laporan_anak.
  const umurMap: Record<string, string> = {};      // anak_id -> "2 th 3 bln" (tampilan)
  const umurBulanMap: Record<string, number> = {}; // anak_id -> umur dalam BULAN (dasar filter rentang usia)
  const ortuMap: Record<string, string> = {}; // ortu_id -> nama orang tua
  const waMap: Record<string, string> = {};    // ortu_id -> no WhatsApp
  const anakIds = [...new Set(list.flatMap((p) => p.anak_ids ?? []))];
  const ortuIds = [...new Set(list.map((p) => p.ortu_id).filter(Boolean))];
  if (anakIds.length || ortuIds.length) {
    const supabase = await createClient();
    const [{ data: anakRows }, { data: ortuRows }] = await Promise.all([
      anakIds.length ? supabase.from('anak').select('id,tanggal_lahir').in('id', anakIds) : Promise.resolve({ data: [] as { id: string; tanggal_lahir: string | null }[] }),
      ortuIds.length ? supabase.from('profiles').select('id,nama_tampilan,email,no_wa').in('id', ortuIds) : Promise.resolve({ data: [] as { id: string; nama_tampilan: string | null; email: string | null; no_wa: string | null }[] }),
    ]);
    const now = new Date();
    for (const a of anakRows ?? []) {
      if (a.tanggal_lahir) {
        const lahir = new Date((a.tanggal_lahir as string) + 'T00:00:00Z');
        umurMap[a.id as string] = umurTeks(lahir, now);
        umurBulanMap[a.id as string] = umurBulanTotal(lahir, now);
      }
    }
    for (const o of ortuRows ?? []) {
      ortuMap[o.id as string] = (o.nama_tampilan as string)?.trim() || (o.email as string)?.split('@')[0] || '—';
      const wa = (o as { no_wa?: string | null }).no_wa;
      if (wa) waMap[o.id as string] = wa;
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
      <PendaftarAdmin awal={list} sertMap={sertMap} eventsAktif={eventsAktif} params={paramEvent} catatanMap={catatanMap} umurMap={umurMap} umurBulanMap={umurBulanMap} ortuMap={ortuMap} kuota={{ baby: kuotaEvent.baby, toddler: kuotaEvent.toddler, gabungan: kuotaEvent.gabungan }}
        waMap={waMap} judulEvent={ev?.judul ?? 'Event'}
        kelasTersedia={[
          ...((ev?.baby_jam_mulai || ev?.baby_tanggal) ? ['baby'] : []),
          ...((ev?.toddler_jam_mulai || ev?.toddler_tanggal) ? ['toddler'] : []),
        ]} />
    </div>
  );
}
