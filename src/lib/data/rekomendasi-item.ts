// src/lib/data/rekomendasi-item.ts — katalog & daftar rekomendasi item (produk/event/materi)
import { createClient } from '@/lib/supabase/server';
import type { RekomendasiItem } from '@/lib/game/tipe';

export interface KatalogItem { id: string; judul: string; sub?: string | null }
export interface Katalog { produk: KatalogItem[]; event: KatalogItem[]; materi: KatalogItem[] }

/** Katalog item yang bisa direkomendasikan (produk tampil, event tampil, materi aktif). */
export async function getKatalogRekomendasi(): Promise<Katalog> {
  const s = await createClient();
  const [{ data: produk }, { data: event }, { data: materi }] = await Promise.all([
    s.from('produk').select('id,nama,harga').eq('status', 'tampil').order('nama'),
    s.from('event').select('id,judul,tanggal').eq('status', 'tampil').order('tanggal', { ascending: false }),
    s.from('kelas_bermain').select('id,judul').eq('status', 'aktif').order('judul'),
  ]);
  return {
    produk: (produk ?? []).map((p) => ({ id: p.id as string, judul: p.nama as string, sub: `Rp ${((p.harga as number) || 0).toLocaleString('id-ID')}` })),
    event: (event ?? []).map((e) => ({ id: e.id as string, judul: e.judul as string, sub: (e.tanggal as string) ?? null })),
    materi: (materi ?? []).map((m) => ({ id: m.id as string, judul: m.judul as string, sub: null })),
  };
}

const RCOLS = 'id,anak_id,ortu_id,pemberi_id,pemberi_nama,pendaftaran_id,jenis,ref_id,judul,catatan,created_at';

/** Rekomendasi item untuk satu anak (baru→lama). RLS: ortu/pemberi/admin. */
export async function getRekomendasiItemAnak(anakId: string): Promise<RekomendasiItem[]> {
  const s = await createClient();
  const { data } = await s.from('rekomendasi_item').select(RCOLS)
    .eq('anak_id', anakId).order('created_at', { ascending: false });
  return (data ?? []) as unknown as RekomendasiItem[];
}

/** Rekomendasi item untuk banyak anak (map anak_id → item[]) — untuk daftar peserta guru. */
export async function getRekomendasiItemByAnakIds(anakIds: string[]): Promise<Record<string, RekomendasiItem[]>> {
  const map: Record<string, RekomendasiItem[]> = {};
  if (anakIds.length === 0) return map;
  const s = await createClient();
  const { data } = await s.from('rekomendasi_item').select(RCOLS)
    .in('anak_id', anakIds).order('created_at', { ascending: false });
  for (const r of (data ?? []) as unknown as RekomendasiItem[]) (map[r.anak_id] ??= []).push(r);
  return map;
}
