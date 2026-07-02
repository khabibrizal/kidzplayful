// src/lib/data/sertifikat.ts — baca e-sertifikat (sisi orang tua / view)
import { createClient } from '@/lib/supabase/server';
import type { Sertifikat } from '@/lib/game/tipe';

const COLS = 'id,event_id,anak_id,ortu_id,anak_nama,event_judul,event_tanggal,lokasi,bg_url,dokumentasi_url,diterbitkan_oleh,created_at';

/** Semua sertifikat milik satu anak (RLS membatasi ke sertifikat milik ortu login). */
export async function getSertifikatAnak(anakId: string): Promise<Sertifikat[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s.from('sertifikat').select(COLS).eq('anak_id', anakId).order('created_at', { ascending: false });
  return (data ?? []) as unknown as Sertifikat[];
}

/** Satu sertifikat berdasarkan id (RLS: hanya ortu pemilik / admin). */
export async function getSertifikat(id: string): Promise<Sertifikat | null> {
  const s = await createClient();
  const { data } = await s.from('sertifikat').select(COLS).eq('id', id).maybeSingle();
  return (data as unknown as Sertifikat) ?? null;
}
