// src/lib/data/tantangan-kustom.ts — baca tantangan kustom + opsi form (admin)
import { createClient } from '@/lib/supabase/server';
import type { SyaratItem } from '@/lib/domain/tantangan-kustom';

export interface TantanganRow {
  id: string; judul: string; deskripsi: string; lencana_kode: string; bonus_koin: number; syarat: SyaratItem[]; aktif: boolean; usia_min: number; usia_max: number;
}

export async function getTantanganAdmin(): Promise<TantanganRow[]> {
  const s = await createClient();
  const { data } = await s.from('tantangan_kustom').select('id,judul,deskripsi,lencana_kode,bonus_koin,syarat,aktif,usia_min,usia_max').order('created_at', { ascending: false });
  return (data ?? []) as unknown as TantanganRow[];
}

export interface OpsiTantangan {
  games: { id: string; label: string }[];
  tema: { id: string; nama: string }[];
}

type RawPaket = { id: string; judul: string; tema: { nama: string } | { nama: string }[] | null };

export async function getOpsiTantangan(): Promise<OpsiTantangan> {
  const s = await createClient();
  const [{ data: paket }, { data: tema }] = await Promise.all([
    s.from('paket_aset').select('id,judul,tema:tema_id(nama)').order('created_at', { ascending: false }),
    s.from('tema').select('id,nama').order('created_at', { ascending: false }),
  ]);
  const games = ((paket ?? []) as unknown as RawPaket[]).map((p) => {
    const nama = (Array.isArray(p.tema) ? p.tema[0] : p.tema)?.nama;
    return { id: p.id, label: nama ? `${nama} — ${p.judul}` : p.judul };
  });
  return { games, tema: (tema ?? []) as { id: string; nama: string }[] };
}
