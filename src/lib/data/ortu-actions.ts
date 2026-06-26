// src/lib/data/ortu-actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { umurTahun, modeDefault } from '@/lib/domain/anak';

async function sesi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, userId: user.id };
}

export async function updateAnak(anakId: string, nama: string, tanggalLahir: string) {
  const { supabase } = await sesi();
  if (!nama.trim() || !tanggalLahir) throw new Error('Nama & tanggal lahir wajib.');
  const umur = umurTahun(new Date(tanggalLahir + 'T00:00:00Z'), new Date());
  const { error } = await supabase.from('anak')
    .update({ nama: nama.trim(), tanggal_lahir: tanggalLahir, mode_default: modeDefault(umur) })
    .eq('id', anakId);
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath(`/anak/${anakId}`);
}

export async function setBatas(anakId: string, menit: number) {
  const { supabase } = await sesi();
  const { error } = await supabase.from('anak').update({ batas_menit: menit }).eq('id', anakId);
  if (error) throw new Error(error.message);
  revalidatePath(`/anak/${anakId}`);
}

export async function hapusAnak(anakId: string) {
  const { supabase } = await sesi();
  const { error } = await supabase.from('anak').delete().eq('id', anakId);
  if (error) throw new Error(error.message);
  redirect('/pilih-anak');
}

export async function setPin(pin: string) {
  const { supabase, userId } = await sesi();
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN harus 4 angka.');
  const { error } = await supabase.from('profiles').update({ pin_ortu: pin }).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/pengaturan');
}
