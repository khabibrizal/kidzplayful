// src/lib/data/admin-komunitas.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return supabase;
}

export async function moderasiPostingan(id: string, status: 'tampil' | 'disembunyikan') {
  const supabase = await adminDb();
  const { error } = await supabase.from('postingan').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/komunitas'); revalidatePath('/komunitas');
}
export async function hapusPostinganAdmin(id: string) {
  const supabase = await adminDb();
  const { error } = await supabase.from('postingan').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/komunitas'); revalidatePath('/komunitas');
}
export async function moderasiKomentar(id: string, status: 'tampil' | 'disembunyikan') {
  const supabase = await adminDb();
  const { error } = await supabase.from('komentar').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/komunitas');
}
export async function hapusKomentarAdmin(id: string) {
  const supabase = await adminDb();
  const { error } = await supabase.from('komentar').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/komunitas');
}
export async function tuntaskanLaporan(id: string) {
  const supabase = await adminDb();
  await supabase.from('laporan').delete().eq('id', id);
  revalidatePath('/admin/komunitas');
}
