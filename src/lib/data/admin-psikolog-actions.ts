// src/lib/data/admin-psikolog-actions.ts — jadikan/cabut psikolog (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  return s;
}

/** Jadikan psikolog berdasarkan email (akun harus sudah terdaftar). */
export async function jadikanPsikolog(email: string): Promise<void> {
  const s = await adminDb();
  const e = email.trim().toLowerCase();
  if (!e) throw new Error('Email wajib diisi.');
  const { data: prof } = await s.from('profiles').select('id').eq('email', e).maybeSingle();
  if (!prof) throw new Error('Email belum terdaftar. Minta psikolog daftar dulu di halaman Daftar.');
  const { error } = await s.from('profiles').update({ is_psikolog: true }).eq('id', prof.id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/psikolog');
}

export async function cabutPsikolog(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('profiles').update({ is_psikolog: false }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/psikolog');
}
