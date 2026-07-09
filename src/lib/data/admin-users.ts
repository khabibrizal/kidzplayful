// src/lib/data/admin-users.ts — baca daftar user & role (admin/super user)
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface UserRow {
  id: string; email: string | null; nama_tampilan: string | null;
  is_superuser: boolean; is_admin: boolean; is_guru: boolean; is_investor: boolean;
}

export interface Pengelola { id: string; isSuperuser: boolean; isAdmin: boolean; }

/** Guard halaman kelola user: hanya admin atau super user. */
export async function getPengelolaUserTerjamin(): Promise<Pengelola> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) redirect('/pilih-anak');
  return { id: user.id, isSuperuser: !!prof.is_superuser, isAdmin: !!prof.is_admin };
}

/** Daftar user yang memiliki salah satu role (super user/admin/guru/investor), + pencarian email. */
export async function getDaftarUser(q?: string): Promise<UserRow[]> {
  try {
    const s = await createClient();
    let query = s.from('profiles')
      .select('id,email,nama_tampilan,is_superuser,is_admin,is_guru,is_investor')
      .or('is_superuser.eq.true,is_admin.eq.true,is_guru.eq.true,is_investor.eq.true')
      .order('email');
    if (q && q.trim()) query = query.ilike('email', `%${q.trim()}%`);
    const { data } = await query.limit(200);
    return (data ?? []) as UserRow[];
  } catch { return []; }
}
