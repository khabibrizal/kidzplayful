// src/lib/data/favorit-actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** Toggle favorit kelas bermain untuk ortu yang login. Mengembalikan status baru (true = favorit). */
export async function toggleFavorit(kelasId: string): Promise<boolean> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: ada } = await s
    .from('favorit')
    .select('kelas_id')
    .eq('ortu_id', user.id)
    .eq('kelas_id', kelasId)
    .maybeSingle();
  if (ada) {
    await s.from('favorit').delete().eq('ortu_id', user.id).eq('kelas_id', kelasId);
  } else {
    await s.from('favorit').insert({ ortu_id: user.id, kelas_id: kelasId });
  }
  revalidatePath('/pilih-anak');
  return !ada;
}
