// src/lib/data/admin-anak-actions.ts — aksi admin atur gamifikasi anak
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';

async function adminDb() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return supabase;
}

export async function setStreakKoin(anakId: string, streak: number, koin: number) {
  const s = await adminDb();
  const { error } = await s.from('anak').update({
    streak: Math.max(0, Math.floor(Number(streak) || 0)),
    koin: Math.max(0, Math.floor(Number(koin) || 0)),
    // patok streak_terakhir ke hari ini agar nilai manual berlanjut mulus saat anak main lagi
    streak_terakhir: tanggalWIB(),
  }).eq('id', anakId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/anak');
}

export async function toggleLencana(anakId: string, kode: string, beri: boolean) {
  const s = await adminDb();
  if (beri) {
    const { error } = await s.from('lencana_anak').upsert({ anak_id: anakId, kode });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await s.from('lencana_anak').delete().eq('anak_id', anakId).eq('kode', kode);
    if (error) throw new Error(error.message);
  }
  revalidatePath('/admin/anak');
}
