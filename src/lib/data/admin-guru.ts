// src/lib/data/admin-guru.ts — kelola akun guru (admin)
import { createClient } from '@/lib/supabase/server';

export interface GuruRow { id: string; email: string | null; nama_tampilan: string | null }

export async function getDaftarGuru(): Promise<GuruRow[]> {
  const s = await createClient();
  const { data } = await s.from('profiles').select('id,email,nama_tampilan').eq('is_guru', true).order('email');
  return (data ?? []) as unknown as GuruRow[];
}
