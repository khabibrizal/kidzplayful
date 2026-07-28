// src/lib/data/admin-reminder-actions.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function tandaiReminder(pendaftaranId: string, terkirim: boolean): Promise<void> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  const { error } = await s.from('pendaftaran_event').update({ reminder_terkirim: terkirim }).eq('id', pendaftaranId);
  if (error) throw new Error(error.message);
}

export async function simpanPesanReminder(eventId: string, pesan: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Tidak terautentikasi' };
    const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!prof?.is_admin) return { ok: false, error: 'Bukan admin' };
    const { error } = await s.from('event').update({ pesan_reminder: pesan.trim() || null }).eq('id', eventId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/reminder');
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}
