// src/lib/data/admin-users-actions.ts — kelola role user (admin/super user)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const KOLOM: Record<string, 'is_superuser' | 'is_admin' | 'is_guru' | 'is_investor'> = {
  superuser: 'is_superuser', admin: 'is_admin', guru: 'is_guru', investor: 'is_investor',
};
const ROLE_TINGGI = new Set(['superuser', 'admin']); // hanya super user yang boleh atur

async function pengelola() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Tidak berwenang.');
  return { s, uid: user.id, isSuperuser: !!prof.is_superuser };
}

async function terapkanRole(userId: string, role: string, value: boolean) {
  const kolom = KOLOM[role];
  if (!kolom) throw new Error('Role tidak dikenal.');
  const { s, uid, isSuperuser } = await pengelola();
  if (ROLE_TINGGI.has(role) && !isSuperuser) throw new Error('Hanya Super User yang dapat mengatur role Admin / Super User.');
  if (role === 'superuser' && !value && userId === uid) throw new Error('Tidak dapat mencabut Super User dari diri sendiri.');

  // Set super user otomatis juga jadikan admin (agar bisa akses panel admin)
  const patch: Record<string, boolean> = { [kolom]: value };
  if (role === 'superuser' && value) patch.is_admin = true;

  const { error } = await s.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}

/** Toggle role via form (userId, role, value). */
export async function setRole(formData: FormData) {
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '');
  const value = String(formData.get('value') ?? '') === '1';
  if (!userId) throw new Error('User tidak valid.');
  await terapkanRole(userId, role, value);
}

/** Tambah role berdasarkan email (akun harus sudah terdaftar). */
export async function tambahUserRole(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '');
  if (!email) throw new Error('Email wajib diisi.');
  const { s } = await pengelola();
  const { data: prof } = await s.from('profiles').select('id').eq('email', email).maybeSingle();
  if (!prof) throw new Error('Email belum terdaftar. Minta user mendaftar dulu di halaman Daftar, lalu tetapkan role di sini.');
  await terapkanRole(prof.id, role, true);
}
