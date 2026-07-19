// src/lib/data/fokus-area.ts — master data Fokus Area Perkembangan (kelas bermain)
import { createClient } from '@/lib/supabase/server';

export interface FokusArea { id: string; key: string; label: string; urutan: number; aktif: boolean }

const COLS = 'id,key,label,urutan,aktif';

/** Semua area (untuk halaman master data admin). */
export async function getFokusAreaSemua(): Promise<FokusArea[]> {
  const s = await createClient();
  const { data } = await s.from('fokus_area').select(COLS).order('urutan').order('label');
  return (data ?? []) as unknown as FokusArea[];
}

/** Area aktif saja (untuk chips di form Kelas Bermain). */
export async function getFokusAreaAktif(): Promise<FokusArea[]> {
  const s = await createClient();
  const { data } = await s.from('fokus_area').select(COLS).eq('aktif', true).order('urutan').order('label');
  return (data ?? []) as unknown as FokusArea[];
}

/** Peta key → label (untuk tampilan detail kelas di sisi user). */
export async function getLabelFokusArea(): Promise<Record<string, string>> {
  const s = await createClient();
  const { data } = await s.from('fokus_area').select('key,label');
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.key as string] = r.label as string;
  return map;
}
