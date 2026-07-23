// src/lib/data/kategori-usia.ts — master data Kategori Usia (dipakai form Game / paket_aset)
import { createClient } from '@/lib/supabase/server';

export interface KategoriUsia { id: string; nama: string; usia_min: number; usia_max: number; urutan: number; aktif: boolean }

const COLS = 'id,nama,usia_min,usia_max,urutan,aktif';

/** Semua kategori (halaman master admin). */
export async function getKategoriUsiaSemua(): Promise<KategoriUsia[]> {
  const s = await createClient();
  const { data } = await s.from('kategori_usia').select(COLS).order('urutan').order('usia_min');
  return (data ?? []) as unknown as KategoriUsia[];
}

/** Kategori aktif saja (dropdown di form Game). */
export async function getKategoriUsiaAktif(): Promise<KategoriUsia[]> {
  const s = await createClient();
  const { data } = await s.from('kategori_usia').select(COLS).eq('aktif', true).order('urutan').order('usia_min');
  return (data ?? []) as unknown as KategoriUsia[];
}
