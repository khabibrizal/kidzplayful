// src/lib/data/event.ts — baca event (sisi user)
import { createClient } from '@/lib/supabase/server';
import type { EventKelas } from '@/lib/game/tipe';

const COLS = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,harga_pendamping,diskon_langganan_persen,status,baby_tanggal,baby_jam_mulai,baby_jam_selesai,toddler_tanggal,toddler_jam_mulai,toddler_jam_selesai';

export async function getEventTampil(): Promise<EventKelas[]> {
  const s = await createClient();
  const { data } = await s.from('event').select(COLS).eq('status', 'tampil').order('tanggal', { ascending: true });
  return (data ?? []) as unknown as EventKelas[];
}

export async function getEvent(id: string): Promise<EventKelas | null> {
  const s = await createClient();
  const { data } = await s.from('event').select(COLS).eq('id', id).maybeSingle();
  return (data as unknown as EventKelas) ?? null;
}

/** Event (kelas bermain) yang diikuti ortu yang login + status + ada/tidaknya catatan. */
export async function getEventDiikuti(): Promise<{ event: EventKelas; status: string; adaCatatan: boolean }[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s
    .from('pendaftaran_event')
    .select(`status, created_at, event:event_id(${COLS})`)
    .eq('ortu_id', user.id)
    .order('created_at', { ascending: false });
  const { data: cat } = await s.from('catatan_perkembangan').select('event_id').eq('ortu_id', user.id);
  const adaSet = new Set((cat ?? []).map((c) => c.event_id as string));
  const seen = new Set<string>();
  const out: { event: EventKelas; status: string; adaCatatan: boolean }[] = [];
  for (const r of data ?? []) {
    const ev = (Array.isArray(r.event) ? r.event[0] : r.event) as unknown as EventKelas;
    if (!ev || seen.has(ev.id)) continue;
    seen.add(ev.id);
    out.push({ event: ev, status: r.status as string, adaCatatan: adaSet.has(ev.id) });
  }
  return out;
}

export interface PendaftaranSaya {
  /** status pendaftaran terbaru per event (termasuk 'ditolak'). */
  statusMap: Record<string, string>;
  /** anak terdaftar (bukan 'ditolak') per event + status masing-masing. */
  pesertaMap: Record<string, { nama: string; status: string }[]>;
  /** alasan penolakan terbaru per event (bila status terakhir 'ditolak'). */
  alasanMap: Record<string, string>;
}

/**
 * Gabungan status + peserta pendaftaran ortu, per event — SATU query `pendaftaran_event`.
 * Menggantikan getStatusPendaftaranSaya + getPesertaPerEvent (dulu 2 query + 2 getUser).
 * Terima `userId` dari pemanggil agar tak perlu getUser ulang.
 * Pendaftaran 'ditolak' tetap dihitung untuk status, tapi TIDAK untuk peserta (boleh daftar ulang).
 */
export async function getPendaftaranSaya(userId: string): Promise<PendaftaranSaya> {
  const s = await createClient();
  const { data } = await s
    .from('pendaftaran_event')
    .select('event_id,anak_nama,status,alasan_tolak,created_at')
    .eq('ortu_id', userId)
    .order('created_at', { ascending: true });
  const statusMap: Record<string, string> = {};
  const pesertaMap: Record<string, { nama: string; status: string }[]> = {};
  const alasanMap: Record<string, string> = {};
  for (const r of data ?? []) {
    const key = r.event_id as string;
    statusMap[key] = r.status as string; // urut asc → status terbaru menang
    if (r.status === 'ditolak') { if (r.alasan_tolak) alasanMap[key] = r.alasan_tolak as string; continue; }
    delete alasanMap[key]; // status terbaru bukan ditolak → alasan lama tak relevan
    if (!pesertaMap[key]) pesertaMap[key] = [];
    for (const nama of (r.anak_nama as string[]) ?? []) pesertaMap[key].push({ nama, status: r.status as string });
  }
  return { statusMap, pesertaMap, alasanMap };
}
