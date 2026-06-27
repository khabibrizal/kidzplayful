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
