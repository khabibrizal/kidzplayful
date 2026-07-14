// src/lib/data/admin.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMenuAkses } from './pengaturan-menu';
import { menuUntukRole, MENU_ADMIN } from '@/lib/menu-admin';

export async function getAdminTerjamin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('email,is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) redirect('/pilih-anak');
  return { id: user.id, email: prof.email as string | null, isSuperuser: !!prof.is_superuser };
}

/** Guard khusus super user (mis. halaman Akses Menu). */
export async function getSuperuserTerjamin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('is_superuser').eq('id', user.id).single();
  if (!prof?.is_superuser) redirect('/admin');
  return { id: user.id };
}

/** Guard panel admin berbasis akses per-role. Kembalikan email, isSuperuser, & set menu yang boleh. */
export async function getAksesAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('email,is_admin,is_superuser,is_investor,is_guru').eq('id', user.id).single();
  if (prof?.is_superuser) {
    return { email: prof.email as string | null, isSuperuser: true, allowed: MENU_ADMIN.map((m) => m.key) };
  }
  const akses = await getMenuAkses();
  const allowed = menuUntukRole(akses, { is_admin: prof?.is_admin, is_investor: prof?.is_investor, is_guru: prof?.is_guru });
  if (allowed.size === 0) redirect('/pilih-anak'); // tak punya akses menu admin apa pun
  return { email: (prof?.email as string | null) ?? null, isSuperuser: false, allowed: [...allowed] };
}
