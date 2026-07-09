// src/lib/data/investor.ts — guard akses Investor Dashboard (read-only)
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getInvestorTerjamin() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await s.from('profiles').select('is_admin,is_investor').eq('id', user.id).single();
  if (!prof?.is_investor && !prof?.is_admin) redirect('/pilih-anak');
  return user;
}
