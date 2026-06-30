// src/lib/data/guru-actions.ts — guru menyimpan Catatan Perkembangan Bermain
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function simpanCatatan(input: {
  eventId: string; anakId: string; ortuId: string;
  aspek: Record<string, string>; catatan: string;
}): Promise<void> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_guru,nama_tampilan').eq('id', user.id).single();
  if (!prof?.is_guru) throw new Error('Bukan guru');

  const { error } = await s.from('catatan_perkembangan').upsert({
    event_id: input.eventId,
    anak_id: input.anakId,
    ortu_id: input.ortuId,
    aspek: input.aspek,
    catatan: input.catatan.trim() || null,
    dinilai_oleh: (prof.nama_tampilan as string) || 'Guru',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'event_id,anak_id' });
  if (error) throw new Error(error.message);
  revalidatePath(`/guru/${input.eventId}`);
}
