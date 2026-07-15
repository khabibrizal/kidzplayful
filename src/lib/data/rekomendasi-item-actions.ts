// src/lib/data/rekomendasi-item-actions.ts — psikolog/guru tambah/hapus rekomendasi item
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getFiturAkses } from './pengaturan-menu';
import { fiturUntukRole } from '@/lib/menu-admin';
import type { JenisRekomendasi } from '@/lib/game/tipe';

async function pemberi() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_psikolog,is_guru,is_admin,nama_tampilan').eq('id', user.id).single();
  if (!prof?.is_psikolog && !prof?.is_guru && !prof?.is_admin) throw new Error('Tidak berwenang.');
  return { s, id: user.id, nama: (prof.nama_tampilan as string) || 'Staf', role: prof };
}

export async function tambahRekomendasiItem(input: {
  anakId: string; ortuId: string; pendaftaranId: string | null;
  jenis: JenisRekomendasi; refId: string; judul: string; catatan?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, id, nama, role } = await pemberi();
    // Cek izin fitur (admin dikontrol via kolom Admin di Akses Fitur; default: semua)
    const boleh = fiturUntukRole(await getFiturAkses(), { is_admin: role.is_admin, is_guru: role.is_guru, is_psikolog: role.is_psikolog });
    if (!boleh.has(input.jenis)) return { ok: false, error: 'Fitur rekomendasi ini tidak diaktifkan untuk Anda.' };
    if (!['produk', 'event', 'materi'].includes(input.jenis)) return { ok: false, error: 'Jenis tidak valid.' };
    if (!input.refId || !input.anakId || !input.ortuId) return { ok: false, error: 'Data tidak lengkap.' };
    const { error } = await s.from('rekomendasi_item').insert({
      anak_id: input.anakId, ortu_id: input.ortuId, pemberi_id: id, pemberi_nama: nama,
      pendaftaran_id: input.pendaftaranId, jenis: input.jenis, ref_id: input.refId,
      judul: input.judul?.trim() || null, catatan: input.catatan?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/anak/${input.anakId}/laporan`);
    if (input.pendaftaranId) { revalidatePath(`/psikolog/${input.pendaftaranId}`); revalidatePath(`/konsultasi/${input.pendaftaranId}`); }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menambah rekomendasi.' };
  }
}

export async function hapusRekomendasiItem(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s } = await pemberi();
    const { error } = await s.from('rekomendasi_item').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menghapus.' };
  }
}
