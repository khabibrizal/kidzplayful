// src/lib/data/admin-reminder-actions.ts
'use server';
import { createClient } from '@/lib/supabase/server';

export async function tandaiReminder(pendaftaranId: string, terkirim: boolean): Promise<void> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  const { error } = await s.from('pendaftaran_event').update({ reminder_terkirim: terkirim }).eq('id', pendaftaranId);
  if (error) throw new Error(error.message);
}
