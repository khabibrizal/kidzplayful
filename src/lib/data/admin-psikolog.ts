// src/lib/data/admin-psikolog.ts — kelola akun psikolog (admin)
import { createClient } from '@/lib/supabase/server';

export interface PsikologRow { id: string; email: string | null; nama_tampilan: string | null }

export async function getDaftarPsikolog(): Promise<PsikologRow[]> {
  const s = await createClient();
  const { data } = await s.from('profiles').select('id,email,nama_tampilan').eq('is_psikolog', true).order('email');
  return (data ?? []) as unknown as PsikologRow[];
}
