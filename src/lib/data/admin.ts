// src/lib/data/admin.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
