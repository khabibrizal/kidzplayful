'use server';
import { updateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';

export interface BahanInput { nama: string; link: string; produkId: string }
export interface AktivitasInput { judul: string; caraMembuat: string; langkah: string[] }
export interface KelasInput {
  judul: string;
  bahan: BahanInput[];
  aktivitas: AktivitasInput[];
  linkIde: string;
  worksheetUrl: string | null;
}
const COLS = 'id,judul,aktivitas,bahan,link_ide,worksheet_url,status';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}
function row(i: KelasInput) {
  return {
    judul: i.judul.trim() || 'Tanpa judul',
    bahan: i.bahan
      .filter((b) => b.nama.trim())
      .map((b) => ({ nama: b.nama.trim(), link: b.link.trim() || null, produk_id: b.produkId || null })),
    aktivitas: i.aktivitas
      .filter((a) => a.judul.trim() || a.langkah.some((l) => l.trim()) || a.caraMembuat.trim())
      .map((a) => ({
        judul: a.judul.trim() || 'Aktivitas',
        cara_membuat: a.caraMembuat.trim() || null,
        langkah: a.langkah.filter((l) => l.trim()),
      })),
    link_ide: i.linkIde.trim() || null,
    worksheet_url: i.worksheetUrl?.trim() || null,
  };
}
export async function buatKelas(i: KelasInput): Promise<KelasBermain> {
  const s = await adminDb();
  if (!i.judul.trim()) throw new Error('Judul wajib diisi.');
  const { data, error } = await s.from('kelas_bermain').insert(row(i)).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as unknown as KelasBermain;
}
export async function updateKelas(id: string, i: KelasInput): Promise<KelasBermain> {
  const s = await adminDb();
  const { data, error } = await s.from('kelas_bermain').update(row(i)).eq('id', id).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as unknown as KelasBermain;
}
export async function toggleStatusKelas(id: string, statusBaru: 'aktif' | 'nonaktif'): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('kelas_bermain').update({ status: statusBaru }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function hapusKelas(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('kelas_bermain').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
export async function setBolehTrialKelas(id: string, boleh: boolean): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('kelas_bermain').update({ boleh_trial: boleh }).eq('id', id);
  if (error) throw new Error(error.message);
  updateTag('katalog'); // segarkan katalog kelas ter-cache
}
