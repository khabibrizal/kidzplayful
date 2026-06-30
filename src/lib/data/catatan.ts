// src/lib/data/catatan.ts — baca catatan perkembangan (sisi orang tua)
import { createClient } from '@/lib/supabase/server';
import type { CatatanPerkembangan } from '@/lib/game/tipe';

const COLS = 'id,event_id,anak_id,ortu_id,aspek,catatan,dinilai_oleh,created_at';

/** Catatan untuk satu anak (semua event). Mengembalikan catatan + judul event. */
export async function getCatatanAnak(anakId: string): Promise<{ c: CatatanPerkembangan; judulEvent: string }[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s.from('catatan_perkembangan')
    .select(`${COLS}, event:event_id(judul)`).eq('anak_id', anakId).order('created_at', { ascending: false });
  return (data ?? []).map((r) => ({
    c: r as unknown as CatatanPerkembangan,
    judulEvent: (Array.isArray(r.event) ? r.event[0]?.judul : (r.event as { judul?: string })?.judul) ?? 'Event',
  }));
}

/** Catatan untuk anak-anak milik ortu di satu event. */
export async function getCatatanEventSaya(eventId: string): Promise<{ c: CatatanPerkembangan; nama: string }[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s.from('catatan_perkembangan')
    .select(`${COLS}, anak:anak_id(nama)`).eq('event_id', eventId).eq('ortu_id', user.id);
  return (data ?? []).map((r) => ({
    c: r as unknown as CatatanPerkembangan,
    nama: (Array.isArray(r.anak) ? r.anak[0]?.nama : (r.anak as { nama?: string })?.nama) ?? 'Anak',
  }));
}

/** Set event_id yang sudah ada catatan untuk anak-anak ortu (untuk badge di /event). */
export async function getEventBerCatatan(): Promise<Set<string>> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return new Set();
  const { data } = await s.from('catatan_perkembangan').select('event_id').eq('ortu_id', user.id);
  return new Set((data ?? []).map((r) => r.event_id as string));
}
