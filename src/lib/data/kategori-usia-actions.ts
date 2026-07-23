// src/lib/data/kategori-usia-actions.ts — CRUD master Kategori Usia (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}

function segarkan() {
  revalidatePath('/admin/kategori-usia');
  revalidatePath('/admin/tema', 'layout'); // form game memuat daftar kategori
}

function bersihkanRange(min: number, max: number): { min: number; max: number } {
  const lo = Math.max(0, Math.min(12, Math.floor(Number(min) || 0)));
  const hi = Math.max(0, Math.min(12, Math.floor(Number(max) || 0)));
  return lo <= hi ? { min: lo, max: hi } : { min: hi, max: lo };
}

export async function buatKategoriUsia(nama: string, usiaMin: number, usiaMax: number, urutan: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const n = nama.trim();
    if (!n) return { ok: false, error: 'Nama kategori wajib diisi.' };
    const { min, max } = bersihkanRange(usiaMin, usiaMax);
    const { error } = await s.from('kategori_usia').insert({ nama: n, usia_min: min, usia_max: max, urutan: Math.floor(urutan) || 0 });
    if (error) return { ok: false, error: error.message };
    segarkan();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menambah kategori.' };
  }
}

export async function updateKategoriUsia(id: string, patch: { nama?: string; usiaMin?: number; usiaMax?: number; urutan?: number; aktif?: boolean }): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const upd: Record<string, unknown> = {};
    if (patch.nama !== undefined) { const n = patch.nama.trim(); if (!n) return { ok: false, error: 'Nama kategori wajib diisi.' }; upd.nama = n; }
    if (patch.usiaMin !== undefined || patch.usiaMax !== undefined) {
      const cur = await s.from('kategori_usia').select('usia_min,usia_max').eq('id', id).single();
      const { min, max } = bersihkanRange(patch.usiaMin ?? cur.data?.usia_min ?? 0, patch.usiaMax ?? cur.data?.usia_max ?? 6);
      upd.usia_min = min; upd.usia_max = max;
    }
    if (patch.urutan !== undefined) upd.urutan = Math.floor(patch.urutan) || 0;
    if (patch.aktif !== undefined) upd.aktif = patch.aktif;
    if (!Object.keys(upd).length) return { ok: true };
    const { error } = await s.from('kategori_usia').update(upd).eq('id', id);
    if (error) return { ok: false, error: error.message };
    segarkan();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }
}

/** Hapus kategori. Game yang memakainya di-set null (usia_min/max snapshot tetap ada). */
export async function hapusKategoriUsia(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const { error } = await s.from('kategori_usia').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    segarkan();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menghapus.' };
  }
}
