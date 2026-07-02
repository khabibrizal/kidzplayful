// src/lib/data/event.ts — baca event (sisi user)
import { createClient } from '@/lib/supabase/server';
import type { EventKelas } from '@/lib/game/tipe';

const COLS = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,status';

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

/**
 * anak_id yang SUDAH terdaftar (status menunggu/diterima) per event, oleh ortu login.
 * Pendaftaran berstatus 'ditolak' TIDAK dihitung → anak boleh didaftarkan ulang.
 */
export async function getAnakTerdaftarPerEvent(): Promise<Record<string, string[]>> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return {};
  const { data } = await s
    .from('pendaftaran_event')
    .select('event_id,anak_ids,status')
    .eq('ortu_id', user.id);
  const map: Record<string, string[]> = {};
  for (const r of data ?? []) {
    if (r.status === 'ditolak') continue;
    const key = r.event_id as string;
    if (!map[key]) map[key] = [];
    for (const id of (r.anak_ids as string[]) ?? []) if (!map[key].includes(id)) map[key].push(id);
  }
  return map;
}

/** Status pendaftaran ortu yang login, per event (status terbaru). */
export async function getStatusPendaftaranSaya(): Promise<Record<string, string>> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return {};
  const { data } = await s
    .from('pendaftaran_event')
    .select('event_id,status,created_at')
    .eq('ortu_id', user.id)
    .order('created_at', { ascending: true });
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.event_id as string] = r.status as string; // terbaru menang (urut asc)
  return map;
}
