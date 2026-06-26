// src/lib/data/admin.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getAdminTerjamin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('email,is_admin').single();
  if (!prof?.is_admin) redirect('/pilih-anak');
  return { id: user.id, email: prof.email };
}
