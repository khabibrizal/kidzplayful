// src/lib/data/pesanan-actions.ts — aksi user pada pesanannya
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function uploadBuktiPesanan(pesananId: string, buktiUrl: string): Promise<void> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { error } = await s.from('pesanan')
    .update({ bukti_url: buktiUrl, status: 'dibayar', updated_at: new Date().toISOString() })
    .eq('id', pesananId).eq('ortu_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/pesanan');
}
