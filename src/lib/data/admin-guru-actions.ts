// src/lib/data/admin-guru-actions.ts — jadikan/cabut guru (admin)
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

/** Jadikan guru berdasarkan email (akun harus sudah terdaftar). */
export async function jadikanGuru(email: string): Promise<void> {
  const s = await adminDb();
  const e = email.trim().toLowerCase();
  if (!e) throw new Error('Email wajib diisi.');
  const { data: prof } = await s.from('profiles').select('id').eq('email', e).maybeSingle();
  if (!prof) throw new Error('Email belum terdaftar. Minta guru daftar dulu di halaman Daftar.');
  const { error } = await s.from('profiles').update({ is_guru: true }).eq('id', prof.id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/guru');
}

export async function cabutGuru(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('profiles').update({ is_guru: false }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/guru');
}
