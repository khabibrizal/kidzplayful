// src/lib/data/komunitas-actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function sesi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('nama_tampilan').single();
  const nama = prof?.nama_tampilan?.trim() || 'Orang Tua';
  return { supabase, userId: user.id, nama };
}

export async function setNamaTampilan(nama: string) {
  const { supabase, userId } = await sesi();
  const { error } = await supabase.from('profiles').update({ nama_tampilan: nama.trim() || null }).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/pengaturan'); revalidatePath('/komunitas');
}

export async function buatPostingan(teks: string, temaId: string | null) {
  const { supabase, userId, nama } = await sesi();
  if (!teks.trim()) throw new Error('Cerita tidak boleh kosong.');
  const { error } = await supabase.from('postingan').insert({
    ortu_id: userId, nama, teks: teks.trim(), tema_id: temaId || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/komunitas');
}

export async function hapusPostingan(id: string) {
  const { supabase } = await sesi();
  const { error } = await supabase.from('postingan').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/komunitas');
}

export async function buatKomentar(postId: string, teks: string) {
  const { supabase, userId, nama } = await sesi();
  if (!teks.trim()) throw new Error('Komentar kosong.');
  const { error } = await supabase.from('komentar').insert({
    postingan_id: postId, ortu_id: userId, nama, teks: teks.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/komunitas/${postId}`); revalidatePath('/komunitas');
}

export async function toggleSuka(postId: string) {
  const { supabase, userId } = await sesi();
  const { data: ada } = await supabase.from('suka').select('postingan_id').eq('postingan_id', postId).eq('ortu_id', userId).maybeSingle();
  if (ada) await supabase.from('suka').delete().eq('postingan_id', postId).eq('ortu_id', userId);
  else await supabase.from('suka').insert({ postingan_id: postId, ortu_id: userId });
  revalidatePath('/komunitas'); revalidatePath(`/komunitas/${postId}`);
}

export async function lapor(input: { postinganId?: string; komentarId?: string; alasan: string }) {
  const { supabase, userId } = await sesi();
  const { error } = await supabase.from('laporan').insert({
    postingan_id: input.postinganId ?? null,
    komentar_id: input.komentarId ?? null,
    pelapor: userId,
    alasan: input.alasan?.trim() || null,
  });
  if (error) throw new Error(error.message);
}
