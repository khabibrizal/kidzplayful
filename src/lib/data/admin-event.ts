// src/lib/data/admin-event.ts — baca event & pendaftaran untuk admin (dipanggil dari halaman admin terjamin)
import { createClient } from '@/lib/supabase/server';
import type { EventKelas, PendaftaranEvent } from '@/lib/game/tipe';

const COLS = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,status';

export async function getEventSemua(): Promise<EventKelas[]> {
  const s = await createClient();
  const { data } = await s.from('event').select(COLS).order('tanggal', { ascending: false });
  return (data ?? []) as unknown as EventKelas[];
}

export async function getEventAdmin(id: string): Promise<EventKelas | null> {
  const s = await createClient();
  const { data } = await s.from('event').select(COLS).eq('id', id).maybeSingle();
  return (data as unknown as EventKelas) ?? null;
}

/** Jumlah pendaftar per event (untuk badge di daftar admin). */
export async function getJumlahPendaftar(): Promise<Record<string, number>> {
  const s = await createClient();
  const { data } = await s.from('pendaftaran_event').select('event_id');
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.event_id as string] = (map[r.event_id as string] ?? 0) + 1;
  return map;
}

export async function getPendaftaranByEvent(eventId: string): Promise<PendaftaranEvent[]> {
  const s = await createClient();
  const { data } = await s
    .from('pendaftaran_event')
    .select('id,event_id,ortu_id,anak_ids,anak_nama,jumlah_anak,total,bukti_url,status,created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as PendaftaranEvent[];
}
