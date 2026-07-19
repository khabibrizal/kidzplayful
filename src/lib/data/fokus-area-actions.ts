// src/lib/data/fokus-area-actions.ts — CRUD master Fokus Area Perkembangan (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/slug';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}

function segarkan() {
  revalidatePath('/admin/fokus-area');
  revalidatePath('/admin/kelas-bermain');
}

/** Tambah area baru. Key di-slug dari label (stabil, dipakai kelas_bermain.fokus_area). */
export async function buatFokusArea(label: string, urutan: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const l = label.trim();
    if (!l) return { ok: false, error: 'Label wajib diisi.' };
    const key = slugify(l.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() || l);
    if (!key) return { ok: false, error: 'Label tidak valid.' };
    const { error } = await s.from('fokus_area').insert({ key, label: l, urutan: Math.floor(urutan) || 0 });
    if (error) return { ok: false, error: error.code === '23505' ? `Area dengan key "${key}" sudah ada.` : error.message };
    segarkan();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menambah area.' };
  }
}

/** Ubah label/urutan/aktif. Key TIDAK diubah agar data kelas lama tetap cocok. */
export async function updateFokusArea(id: string, patch: { label?: string; urutan?: number; aktif?: boolean }): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const upd: Record<string, unknown> = {};
    if (patch.label !== undefined) { const l = patch.label.trim(); if (!l) return { ok: false, error: 'Label wajib diisi.' }; upd.label = l; }
    if (patch.urutan !== undefined) upd.urutan = Math.floor(patch.urutan) || 0;
    if (patch.aktif !== undefined) upd.aktif = patch.aktif;
    if (!Object.keys(upd).length) return { ok: true };
    const { error } = await s.from('fokus_area').update(upd).eq('id', id);
    if (error) return { ok: false, error: error.message };
    segarkan();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }
}

/** Hapus area. Kelas lama yang masih menyimpan key ini menampilkan key mentah (fallback). */
export async function hapusFokusArea(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const { error } = await s.from('fokus_area').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    segarkan();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menghapus.' };
  }
}
